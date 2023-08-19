// ==UserScript==
// @name Wanikani Review Statistics
// @namespace https://tampermonkey.net/
// @version 0.2
// @description Show a popup with statistics about the review session when returning to the dashboard
// @author leohumnew
// @match https://www.wanikani.com/subjects/review
// @grant none
// ==/UserScript==

(function() {
    'use strict';
    // Variables to store the statistics
    let questionsAnswered = 0;
    let itemsCorrect = 0;
    let itemsIncorrect = 0;
    let meaningCorrect = 0;
    let meaningIncorrect = 0;
    let readingCorrect = 0;
    let readingIncorrect = 0;
    let itemsList = [];
    let currentQuestionType = "";
    let currentCategory = "";
    let currentWord = "";
    let currentSRSLevel = -1;
    let quizQueueSRS = [];
    let SRSLevelNames = ["Lesson", "Appr. I", "Appr. II", "Appr. III", "Appr. IV", "Guru I", "Guru II", "Master", "Enl.", "Burned", "Error"];

    // Create style element with popup styles and append it to the document head
    let style = document.createElement("style");
    style.textContent = '.summary-popup { position: fixed; width: 100%; height: 100%; z-index: 9999; color: var(--color-text); background-color: var(--color-dashboard-panel-content-background, #eee); padding: 50px; overflow-y: auto; font-size: var(--font-size-large); }';
    style.textContent += ".summary-popup > a { background-color: transparent; text-decoration: none; text-align: center; margin: 30px 50px; position: absolute; top: 0px; right: 0px; cursor: pointer; padding: 10px; border-radius: 5px; outline: 1px solid var(--color-tertiary, black); color: var(--color-text) } .summary-popup > a:hover { color: var(--color-tertiary, #bbb); }";
    style.textContent += ".summary-popup table { border-collapse: collapse; width: 100%; background-color: var(--color-dashboard-panel-background, #000); } .summary-popup td { border: none; padding: 5px; text-align: center}"
    style.textContent += ".summary-popup h1 { margin-bottom: 10px; font-weight: bold; font-size: var(--font-size-xlarge); } .summary-popup h2 { font-weight: bold; margin-top: 20px; padding: 20px; color: #fff; font-size: var(--font-size-large); border-radius: 5px;); }"
    style.textContent += ".summary-popup ul { background-color: var(--color-dashboard-panel-background, #fff); padding: 0 5px; } .summary-popup li { display: inline-block; } .summary-popup li a { display: block; margin: 10px 5px; padding: 10px; color: var(--color-text-dark, #fff); font-size: 1.5rem; border-radius: 5px; text-decoration: none; }"
    style.textContent += ".summary-popup .summary-popup__popup { background-color: var(--color-menu, #333); color: var(--color-text, #fff); text-decoration: none; padding: 10px; border-radius: 5px; position: absolute; z-index: 9999; display: none; font-size: var(--font-size-medium); box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5); width: fit-content; line-height: 1.3; }";
    style.textContent += ".summary-popup .summary-popup__popup:after { content: ''; position: absolute; top: calc(50% - 5px); margin-left: -10px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid var(--color-menu, #333); }";
    style.textContent += ".summary-popup .summary-popup__popup--left:after { right: 5px; transform: rotate(90deg) } .summary-popup .summary-popup__popup--right:after { left: -5px; transform: rotate(-90deg); }";

    document.head.appendChild(style);

    // Function to calculate the percentage
    function percentage(numerator, denominator) {
        return Math.round(numerator / denominator * 100) + "%";
    }

    // Function to get quiz queue SRS
    function getQuizQueueSRS() {
        quizQueueSRS = JSON.parse(document.querySelectorAll("#quiz-queue script[data-quiz-queue-target='subjectIdsWithSRS']")[0].innerHTML);
    }
    getQuizQueueSRS();

    // Function to create a popup element
    function createPopup(content) {
        // Create a div element with some styles
        let popup = document.createElement("div");
        popup.className = "summary-popup";

        // Create a close button with some styles and functionality
        let closeButton = document.createElement("a");
        closeButton.textContent = "Dashboard";
        closeButton.href = "https://www.wanikani.com/dashboard";

        // Append the content and the close button to the popup
        popup.appendChild(content);
        popup.appendChild(closeButton);

        return popup;
    }

    // Function to create a table element with some data
    function createTable(data) {
        // Create a table
        let table = document.createElement("table");
        let row = document.createElement("tr");
        let row2 = document.createElement("tr");

        // Loop through the data array
        for (let i = 0; i < data.length; i++) {
            // Create table cell elements
            let cell = document.createElement("td");
            cell.textContent = data[i][0];
            cell.style.fontSize = "var(--font-size-xxlarge)";
            cell.style.fontWeight = "bold";
            cell.style.paddingTop = "25px";
            row.appendChild(cell);

            let cell2 = document.createElement("td");
            cell2.textContent = data[i][1];
            cell2.style.fontSize = "var(--font-size-medium)";
            cell2.style.paddingBottom = "25px";
            row2.appendChild(cell2);
        }
        // Append the rows to the table
        table.appendChild(row);
        table.appendChild(row2);

        // Return the table element
        return table;
    }

    // Function to show the statistics when returning to the dashboard
    function showStatistics() {
        console.log(itemsList);
        // Check if there are any items reviewed
        if (questionsAnswered > 0) {
            // Create an array of data for the table
            let data = [
                [itemsList.length, "Items Completed"],
                [percentage(itemsCorrect, questionsAnswered), "Questions Answered Correctly"],
                [percentage(meaningCorrect, meaningCorrect + meaningIncorrect), "Meanings Correct"],
                [percentage(readingCorrect, readingCorrect + readingIncorrect), "Readings Correct"]
            ]

            // Create a table element with the data
            let table = createTable(data);

            // Create a heading element with some text and styles
            let heading = document.createElement("h1");
            heading.textContent = "Review Statistics";

            // Create an unordered list element
            let listCorrect = document.createElement("ul");
            let listIncorrect = document.createElement("ul");

            // Loop through the items list array
            let srsUpNum = 0;
            for (let i = 0; i < itemsList.length; i++) {
                // Create a list item element with the character or image
                let listItem = document.createElement("li");
                let listItemLink = document.createElement("a");
                if(itemsList[i].characters.url == null) listItemLink.textContent = itemsList[i].characters;
                else {
                    let listItemImage = document.createElement("img");
                    listItemImage.src = itemsList[i].characters.url;
                    listItemLink.appendChild(listItemImage);
                }
                if (itemsList[i].type === "Radical") {
                    listItemLink.style.backgroundColor = "var(--color-radical, #00aaff)";
                    listItemLink.href = "https://www.wanikani.com/radicals/" + itemsList[i].meanings[0];
                } else if (itemsList[i].type === "Kanji") {
                    listItemLink.style.backgroundColor = "var(--color-kanji, #ff00aa)";
                    listItemLink.href = "https://www.wanikani.com/kanji/" + itemsList[i].characters;
                }
                else {
                    listItemLink.style.backgroundColor = "var(--color-vocabulary, #aa00ff)";
                    listItemLink.href = "https://www.wanikani.com/vocabulary/" + itemsList[i].characters;
                }

                // Create popup with meaning and reading info on hover
                let popup = document.createElement("div");
                popup.innerHTML = "Meaning: <strong>" + itemsList[i].meanings[0] + "</strong>";
                if(itemsList[i].type == "Kanji") {
                    for (let k = 0; k < itemsList[i].readings.length; k++) {
                        if (itemsList[i].readings[k] != null) {
                            let label = "";
                            switch (k) {
                            case 0:
                                label = "Nanori";
                                break;
                            case 1:
                                label = "Onyomi";
                                break;
                            case 2:
                                label = "Kunyomi";
                                break;
                            }
                            popup.innerHTML += "<br>" + label + ": <strong>" + itemsList[i].readings[k].join(", ") + "</strong>";
                        }
                    }
                }
                else if(itemsList[i].type != "Radical" && itemsList[i].readings[0] != null) {
                    popup.innerHTML += "<br>Reading: <strong>";
                    popup.innerHTML += itemsList[i].readings.map(r => r.reading).join(", ");
                    popup.innerHTML += "</strong>";
                }
                popup.innerHTML += "<br>SRS: " + SRSLevelNames[itemsList[i].oldSRS] + " -> " + SRSLevelNames[itemsList[i].newSRS];

                listItemLink.addEventListener("mouseover", function(e) {
                    // Position the popup element relative to the parent item element: to the right of the parent unless that would cause the popup to go off the screen
                    let infoPos = listItemLink.getBoundingClientRect();
                    let popupWidth = popup.getBoundingClientRect().width;
                    let popupHeight = popup.getBoundingClientRect().height;
                    if (infoPos.right + popupWidth + 5 > window.innerWidth) {
                        popup.style.left = (infoPos.left - popupWidth - 5) + "px";
                        popup.className = "summary-popup__popup summary-popup__popup--left";
                    } else {
                        popup.style.left = infoPos.right + 5 + "px";
                        popup.className = "summary-popup__popup summary-popup__popup--right";
                    }
                    popup.style.top = (infoPos.top + (infoPos.height / 2)) - (popupHeight / 2) + "px";
                    popup.style.display = "block";
                });

                listItemLink.addEventListener("mouseout", function(e) {
                    popup.style.display = "none";
                });
                popup.style.display = "none";

                // Append the list item to the list
                listItemLink.appendChild(popup);
                listItem.appendChild(listItemLink);
                if (itemsList[i].SRSUp) {
                    listCorrect.appendChild(listItem);
                    srsUpNum++;
                }
                else listIncorrect.appendChild(listItem);
            }

            // Create h2 titles for the lists
            let correctTitle = document.createElement("h2");
            correctTitle.textContent = srsUpNum + " Items SRS Up";
            correctTitle.style.backgroundColor = "var(--color-quiz-correct-background, #88cc00)";

            let incorrectTitle = document.createElement("h2");
            incorrectTitle.textContent = (itemsList.length - srsUpNum) + " Items SRS Down";
            incorrectTitle.style.backgroundColor = "var(--color-quiz-incorrect-background, #ff0033)";

            // Create a div element to wrap the table, paragraph and list
            let content = document.createElement("div");
            content.append(heading, table, incorrectTitle, listIncorrect, correctTitle, listCorrect);

            // Create a popup element with the content
            let popup = createPopup(content);

            // Append the popup to the document body
            document.body.appendChild(popup);

            // Reset the statistics variables
            questionsAnswered = 0;
            itemsCorrect = 0;
            itemsIncorrect = 0;
            meaningCorrect = 0;
            meaningIncorrect = 0;
            readingCorrect = 0;
            readingIncorrect = 0;
            itemsList = [];
        }
    }

    // Add an event listener for the didAnswerQuestion event
    window.addEventListener("didAnswerQuestion", function(e) {
        // Check if the answer was correct or not by looking for the correct attribute
        let correct = document.querySelector(".quiz-input__input-container[correct='true']") !== null;

        // Increment the items reviewed counter
        questionsAnswered++;

        // Increment the appropriate counters based on the question type and correctness
        if (currentQuestionType === "meaning") {
            if (correct) {
                meaningCorrect++;
            } else {
                meaningIncorrect++;
            }
        } else if (currentQuestionType === "reading") {
            if (correct) {
                readingCorrect++;
            } else {
                readingIncorrect++;
            }
        }

        // Increment the overall correct or incorrect counter
        if (correct) {
            itemsCorrect++;
        } else {
            itemsIncorrect++;
        }

        // Log the result to the console for debugging purposes
        console.log(currentWord, currentQuestionType, currentCategory, correct);
    });

    // Add an event listener for the didCompleteSubject event
    window.addEventListener("didCompleteSubject", function(e) {
        // Get the subject data from the event detail
        let subject = e.detail.subjectWithStats.subject;
        let didSRSUp = e.detail.subjectWithStats.stats.meaning.incorrect === 0 && e.detail.subjectWithStats.stats.reading.incorrect === 0;
        let reading = null;
        if(subject.type == "Vocabulary" || subject.type == "KanaVocabulary") {
            reading = subject.readings;
        } else if (subject.type == "Kanji") {
            reading = [null, null, null]
            if(subject.nanori.length > 0) {
                reading[0] = subject.nanori;
            }
            if(subject.onyomi.length > 0) {
                reading[1] = subject.onyomi;
            }
            if(subject.kunyomi.length > 0) {
                reading[2] = subject.kunyomi;
            }
        }

        // Calculate the new SRS level
        let newSRSLevel = didSRSUp ? currentSRSLevel + 1 : (currentSRSLevel < 2 ? currentSRSLevel : (currentSRSLevel < 5 ? currentSRSLevel - 1 : currentSRSLevel - 2));
        console.log(subject.characters + " - Old SRS Level: " + SRSLevelNames[currentSRSLevel] + " New SRS Level: " + SRSLevelNames[newSRSLevel]);

        // Push the subject data to the items list array
        let subjectInfoToSave = { characters: subject.characters, type: subject.type, id: subject.id, SRSUp: didSRSUp, meanings: subject.meanings, readings: reading, oldSRS: currentSRSLevel, newSRS: newSRSLevel };
        itemsList.push(subjectInfoToSave);
    });

    // Add an event listener for the willShowNextQuestion event
    window.addEventListener("willShowNextQuestion", function(e) {
        // Set current question variables with event info
        currentQuestionType = e.detail.questionType;
        currentCategory = e.detail.subject.type;
        currentWord = e.detail.subject.characters;

        currentSRSLevel = quizQueueSRS.find(function(element) { return element[0] == e.detail.subject.id })[1];
        if(currentSRSLevel == null) {
            getQuizQueueSRS();
            currentSRSLevel = quizQueueSRS.find(function(element) { return element[0] == e.detail.subject.id })[1];
            if(currentSRSLevel == null) currentSRSLevel = 10;
        }
    });

    // Event listener for registerWrapUpObserver event
    window.addEventListener("registerWrapUpObserver", function(e) {
        console.log(e);
    });

    // Home button override
    let homeButton = document.querySelector(".summary-button");
    homeButton.setAttribute("title", "Show statistics and return to dashboard");
    homeButton.addEventListener("click", function(e) {
        // Prevent the default behavior of the button
        if(questionsAnswered > 0) e.preventDefault();

        showStatistics();
    });

})();
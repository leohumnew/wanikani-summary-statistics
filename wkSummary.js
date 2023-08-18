// ==UserScript==
// @name Wanikani Review Statistics
// @namespace https://tampermonkey.net/
// @version 0.1
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

    // Create style element with popup styles and append it to the document head
    let style = document.createElement("style");
    style.textContent = '.summary-popup { position: fixed; width: 100%; height: 100%; z-index: 9999; color: var(--color-text); background-color: var(--color-dashboard-panel-content-background, #eee); padding: 50px; overflow-y: auto; font-size: var(--font-size-large); }';
    style.textContent += ".summary-popup > a { background-color: transparent; text-decoration: none; text-align: center; margin: 30px 50px; position: absolute; top: 0px; right: 0px; cursor: pointer; padding: 10px; border-radius: 5px; outline: 1px solid var(--color-tertiary, black); color: var(--color-text) } .summary-popup > a:hover { color: var(--color-tertiary, #eee); }";
    style.textContent += ".summary-popup table { border-collapse: collapse; width: 100%; background-color: var(--color-dashboard-panel-background, #000); } .summary-popup td { border: none; padding: 5px; text-align: center}"
    style.textContent += ".summary-popup h1 { margin-bottom: 10px; font-weight: bold; font-size: var(--font-size-xlarge); } .summary-popup h2 { font-weight: bold; margin-top: 20px; padding: 20px; color: #fff; font-size: var(--font-size-large); border-radius: 5px;); }"
    style.textContent += ".summary-popup ul { background-color: var(--color-dashboard-panel-background, #fff); } .summary-popup li { display: inline-block; } .summary-popup li a { display: block; margin: 10px; padding: 10px; color: var(--color-text-dark, #fff); font-size: var(--font-size-large); border-radius: 5px; text-decoration: none; }"
    style.textContent += ".summary-popup .summary-popup__popup { background-color: var(--color-menu, #333); color: var(--color-text, #fff); text-decoration: none; padding: 10px; border-radius: 5px; position: absolute; z-index: 9999; display: none; font-size: var(--font-size-medium); width: 200px; box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5); }";

    document.head.appendChild(style);

    // Function to calculate the percentage
    function percentage(numerator, denominator) {
        return Math.round(numerator / denominator * 100) + "%";
    }

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

        // Return the popup element
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
                popup.className = "summary-popup__popup";
                popup.innerHTML = "Meaning:<b>" + itemsList[i].meanings[0] + "</b>";
                if(itemsList[i].type == "Kanji") {
                    if(itemsList[i].readings[0] != undefined) {
                        popup.innerHTML += "<br>Nanori:</b>";
                        for(let j = 0; j < itemsList[i].readings[0].length; j++) {
                            popup.innerHTML += itemsList[i].readings[0][j] + " ";
                        }
                    }
                    if(itemsList[i].readings[1] != undefined) {
                        popup.innerHTML += "<br>Onyomi:</b>";
                        for(let j = 0; j < itemsList[i].readings[1].length; j++) {
                            popup.innerHTML += itemsList[i].readings[1][j] + " ";
                        }
                    }
                    if(itemsList[i].readings[2] != undefined) {
                        popup.innerHTML += "<br>Kunyomi:</b>";
                        for(let j = 0; j < itemsList[i].readings[2].length; j++) {
                            popup.innerHTML += itemsList[i].readings[2][j] + " ";
                        }
                    }
                }
                if(itemsList[i].type != "Radical" && itemsList[i].readings[0] != undefined) popup.innerHTML += "<br>Reading:<b>" + itemsList[i].readings[0].reading + "</b>"

                listItemLink.addEventListener("mouseover", function(e) {
                    // Position the popup element relative to the parent item element: to the right of the parent unless that would cause the popup to go off the screen
                    let infoPos = listItemLink.getBoundingClientRect();
                    let popupWidth = popup.getBoundingClientRect().width;
                    let popupHeight = popup.getBoundingClientRect().height;
                    if (infoPos.right + popupWidth > window.innerWidth) {
                        popup.style.left = (infoPos.left - popupWidth) + "px";
                    } else {
                        popup.style.left = infoPos.right + "px";
                    }
                    if (infoPos.bottom + popupHeight > window.innerHeight) {
                        popup.style.top = (infoPos.top - popupHeight) + "px";
                    } else {
                        popup.style.top = infoPos.bottom + "px";
                    }
                    popup.style.display = "block";
                });

                listItemLink.addEventListener("mouseout", function(e) {
                    popup.style.display = "none";
                });

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
            content.appendChild(heading);
            content.appendChild(table);
            content.appendChild(incorrectTitle);
            content.appendChild(listIncorrect);
            content.appendChild(correctTitle);
            content.appendChild(listCorrect);

            // Create a popup element with the content
            let popup = createPopup(content);

            // Append the popup to the document body
            document.body.appendChild(popup);
            console.log("appended");

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
        if(subject.type == "Vocabulary") {
            let reading = subject.reading;
        } else if (subject.type == "Kanji") {
            let reading = [3]
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

        console.log(e.detail);

        // Push the subject data to the items list array
        let subjectInfoToSave = { characters: subject.characters, type: subject.type, id: subject.id, SRSUp: didSRSUp, meanings: subject.meanings, readings: subject.readings };
        itemsList.push(subjectInfoToSave);
    });

    // Add an event listener for the willShowNextQuestion event
    window.addEventListener("willShowNextQuestion", function(e) {
        // Set current question variables with event info
        currentQuestionType = e.detail.questionType;
        currentCategory = e.detail.subject.type;
        currentWord = e.detail.subject.characters;
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
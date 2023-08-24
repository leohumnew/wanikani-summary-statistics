// ==UserScript==
// @name Wanikani Review Summary
// @namespace https://tampermonkey.net/
// @version 0.3.1
// @license MIT
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
    let correctHistory = [];
    let itemsList = [];
    let currentQuestionType = "";
    let currentCategory = "";
    let currentWord = "";
    let currentSRSLevel = -1;
    let quizQueueSRS = [];
    let SRSLevelNames = ["Lesson", "Appr. I", "Appr. II", "Appr. III", "Appr. IV", "Guru I", "Guru II", "Master", "Enl.", "Burned", "Error"];

    // Create style element with popup styles and append it to the document head
    let style = document.createElement("style");
    style.textContent = ".summary-popup { position: fixed; width: 100%; height: 100%; z-index: 9999; color: var(--color-text); background-color: var(--color-dashboard-panel-content-background, #eee); padding: 50px; overflow-y: auto; font-size: var(--font-size-large); }";
    style.textContent += ".summary-popup > a { background-color: transparent; text-decoration: none; text-align: center; margin: 30px 50px; position: absolute; top: 0px; right: 0px; cursor: pointer; padding: 10px; border-radius: 5px; outline: 1px solid var(--color-tertiary, black); color: var(--color-text) } .summary-popup > a:hover { color: var(--color-tertiary, #bbb); }";
    style.textContent += ".summary-popup table { border-collapse: collapse; width: 100%; background-color: var(--color-dashboard-panel-background, #000); } .summary-popup td { border: none; padding: 5px; text-align: center; }";
    style.textContent += ".summary-popup h1 { margin-bottom: 10px; font-weight: bold; font-size: var(--font-size-xlarge); } .summary-popup h2 { font-weight: bold; margin-top: 20px; padding: 20px; color: #fff; font-size: var(--font-size-large); border-radius: 5px 5px 0 0; }";
    style.textContent += ".summary-popup ul { background-color: var(--color-dashboard-panel-background, #fff); padding: 0 5px; } .summary-popup li { display: inline-block; } .summary-popup li a { display: block; margin: 10px 5px; padding: 10px; color: var(--color-text-dark, #fff); font-size: 1.5rem; height: 2.6rem; border-radius: 5px; text-decoration: none; } .summary-popup li a img { height: 1.5rem; vertical-align: middle; }";
    style.textContent += ".summary-popup .summary-popup__popup { background-color: var(--color-menu, #ddd); color: var(--color-text, #fff); text-decoration: none; padding: 10px; border-radius: 5px; position: fixed; z-index: 9999; display: none; font-size: var(--font-size-medium); box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5); width: max-content; line-height: 1.3; }";
    style.textContent += ".summary-popup .summary-popup__popup:after { content: ''; position: absolute; top: -8px; margin-left: -10px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid var(--color-menu, #ddd); }";
    style.textContent += ".summary-popup .summary-popup__popup--left:after { right: 15px; } .summary-popup .summary-popup__popup--right:after { left: 25px; }";
    style.textContent += ".summary-popup .accuracy-graph { height: 150px; width: 100%; background-color: var(--color-dashboard-panel-background, #fff); padding: 25px 0; } .summary-popup .accuracy-graph__line { position: relative; transform-origin: 0 0; height: 2px; background-color: var(--color-text); float: left; }";

    document.head.appendChild(style);

    // Function to calculate the percentage
    function percentage(numerator, denominator) {
        if(denominator == 0) return "--";
        return Math.round(numerator / denominator * 100) + "%";
    }

    // Function to get quiz queue SRS
    function getQuizQueueSRS() {
        quizQueueSRS = JSON.parse(document.querySelectorAll("#quiz-queue script[data-quiz-queue-target='subjectIdsWithSRS']")[0].innerHTML);
    }
    getQuizQueueSRS();

    // Clear the data-quiz-queue-done-url-value parameter on #quiz-queue
    document.getElementById("quiz-queue").setAttribute("data-quiz-queue-done-url-value", "");

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
        let row3 = document.createElement("tr");

        // Loop through the data array
        for (let i = 0; i < data.length; i++) {
            // Create table cell elements
            let cell = document.createElement("td");
            cell.textContent = data[i][0];
            cell.style.fontSize = "var(--font-size-xxlarge)";
            cell.style.fontWeight = "bold";
            cell.style.padding = "25px 0 0 0";
            row.appendChild(cell);

            let cell2 = document.createElement("td");
            cell2.textContent = data[i][1];
            cell2.style.fontSize = "var(--font-size-small)";
            cell2.style.fontStyle = "italic";
            cell2.style.color = "var(--color-text-mid, #999)";
            cell2.style.padding = "0 0 10px 0";
            row2.appendChild(cell2);

            let cell3 = document.createElement("td");
            cell3.textContent = data[i][2];
            cell3.style.fontSize = "var(--font-size-medium)";
            cell3.style.paddingBottom = "25px";
            row3.appendChild(cell3);
        }
        // Append the rows to the table
        table.append(row, row2, row3);

        // Return the table element
        return table;
    }

    // Function to show the statistics when returning to the dashboard
    function showStatistics() {
        console.log(itemsList);
        // Check if there are any items reviewed
        if (questionsAnswered > 0) {
            // Create a heading element with some text and styles
            let headingText = document.createElement("h1");
            headingText.textContent = " Review Summary";
            let headingImage = document.createElement("div");
            headingImage.classList = "wk-icon fa-solid fa-square-check";
            headingImage.style.float = "left";
            headingImage.style.margin = "2px 6px 0 0";
            let heading = document.createElement("div");
            heading.append(headingImage, headingText);

            // Create an unordered list element
            let listCorrect = document.createElement("ul");
            let listIncorrect = document.createElement("ul");

            // Loop through the items list array
            let srsUpNum = 0;
            let typeNum = [0, 0, 0];
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
                popup.innerHTML = "Meaning: <strong>" + itemsList[i].meanings.slice(0, 2).join(", ") + "</strong>";
                if(itemsList[i].type == "Kanji") {
                    typeNum[1]++;
                    for (let k = 0; k < itemsList[i].readings.length; k++) { // Nanori, Onyomi, Kunyomi readings if kanji
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
                else if(itemsList[i].type != "Radical" && itemsList[i].readings[0] != null) { // Reading if vocabulary
                    typeNum[2]++;
                    popup.innerHTML += "<br>Reading: <strong>" +
                                    itemsList[i].readings.map(r => r.reading).join(", ") +
                                    "</strong>";
                } else { // No reading if radical
                    typeNum[0]++;
                }
                popup.innerHTML += "<br>SRS: " + SRSLevelNames[itemsList[i].oldSRS] + " -> " + SRSLevelNames[itemsList[i].newSRS];

                popup.style.display = "block";
                popup.style.visibility = "hidden";
                listItemLink.addEventListener("mouseover", function(e) {
                    // Position the popup element relative to the parent item element: to the right of the parent unless that would cause the popup to go off the screen
                    let infoPos = listItemLink.getBoundingClientRect();
                    let popupPos = popup.getBoundingClientRect();
                    if (infoPos.left + popupPos.width + 5 > window.innerWidth) {
                        popup.style.right = window.innerWidth - infoPos.right + "px";
                        popup.style.removeProperty("left");
                        popup.className = "summary-popup__popup summary-popup__popup--left";
                    } else {
                        popup.style.left = infoPos.left + "px";
                        popup.style.removeProperty("right");
                        popup.className = "summary-popup__popup summary-popup__popup--right";
                    }
                    popup.style.top = infoPos.bottom + 5 + "px";
                    popup.style.visibility = "visible";
                });

                listItemLink.addEventListener("mouseout", function(e) {
                    popup.style.visibility = "hidden";
                });
                popup.style.visibility = "hidden";

                // Append the list item to the list
                listItemLink.appendChild(popup);
                listItem.appendChild(listItemLink);
                if (itemsList[i].SRSUp) {
                    listCorrect.appendChild(listItem);
                    srsUpNum++;
                }
                else listIncorrect.appendChild(listItem);
            }

            // Create a header table with main stats
            let data = [
                [itemsList.length, "R: " + typeNum[0] + " / K: " + typeNum[1] + " / V: " + typeNum[2], "Items Completed"],
                [percentage(itemsCorrect, questionsAnswered), itemsCorrect + " out of " + questionsAnswered , "Questions Answered Correctly"],
                [percentage(meaningCorrect, meaningCorrect + meaningIncorrect), meaningCorrect + " out of " + (meaningCorrect + meaningIncorrect), "Meanings Correct"],
                [percentage(readingCorrect, readingCorrect + readingIncorrect), readingCorrect + " out of " + (readingCorrect + readingIncorrect), "Readings Correct"]
            ];
            let table = createTable(data);

            // Create h2 titles for the lists
            let correctTitle = document.createElement("h2");
            let correctTitleIcon = document.createElement("span");
            correctTitleIcon.classList = "wk-icon fa-solid fa-circle-up";
            correctTitle.appendChild(correctTitleIcon);
            correctTitle.innerHTML += " " + srsUpNum + " Items SRS Up";
            correctTitle.style.backgroundColor = "var(--color-quiz-correct-background, #88cc00)";

            let incorrectTitle = document.createElement("h2");
            let incorrectTitleIcon = document.createElement("span");
            incorrectTitleIcon.classList = "wk-icon fa-solid fa-circle-down";
            incorrectTitle.appendChild(incorrectTitleIcon);
            incorrectTitle.innerHTML += " " + (itemsList.length - srsUpNum) + " Items SRS Down";
            incorrectTitle.style.backgroundColor = "var(--color-quiz-incorrect-background, #ff0033)";

            // Create a div element to wrap everything
            let content = document.createElement("div");
            content.append(heading, table, incorrectTitle, listIncorrect, correctTitle, listCorrect);

            // Create a graph showing accuracy throughout the session using the correctHistory array, with an average of 3 elements
            if(itemsList.length > 4) {
                // Title h2
                let graphTitle = document.createElement("h2");
                let graphTitleIcon = document.createElement("span");
                graphTitleIcon.classList = "wk-icon fa-solid fa-chart-simple";
                graphTitle.appendChild(graphTitleIcon);
                graphTitle.innerHTML += " Session Accuracy";
                graphTitle.style.backgroundColor = "var(--color-menu, #777)";
                // Graph
                let graph = document.createElement("div");
                graph.classList = "accuracy-graph";

                // Wrapper
                let graphWrapper = document.createElement("div");
                graphWrapper.append(graphTitle, graph);
                content.appendChild(graphWrapper);
            }

            // Create a popup element with the content
            let popup = createPopup(content);
            document.body.appendChild(popup);

            // Fill the graph with the correctHistory array
            if(itemsList.length > 4) {
                let graphDiv = document.querySelector(".accuracy-graph");
                // Calculate graph data
                let graphData = [];
                for (let i = 1; i < correctHistory.length - 1; i++) {
                    graphData.push((correctHistory[i-1] + correctHistory[i] + correctHistory[i+1]) / 3);
                }
                let graphHeight = 100;
                let graphWidth = graphDiv.getBoundingClientRect().width;
                let graphStep = graphWidth / graphData.length;
                graphDiv.style.paddingLeft = graphStep / 2 + "px";
                let prevPos = {x: null, y: null};
                for (let i = 0; i < graphData.length; i++) {
                    let x = graphStep * i;
                    let y = graphHeight - (graphData[i] * graphHeight);
                    if(prevPos.x != null) {
                        let line = document.createElement("div");
                        line.classList = "accuracy-graph__line";
                        let lineWidth = Math.sqrt(Math.pow(x - prevPos.x, 2) + Math.pow(y - prevPos.y, 2));
                        line.style.width = lineWidth + "px";
                        let rotation = Math.atan2(y - prevPos.y, x - prevPos.x);
                        line.style.transform = "rotate(" + rotation + "rad)";
                        if(rotation != 0) line.style.marginRight = Math.cos(rotation) * lineWidth - lineWidth + "px";
                        line.style.top = prevPos.y + "px";
                        graphDiv.appendChild(line);
                    }
                    prevPos = {x: x, y: y};
                }
            }

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

    let eventToObserve = window.doublecheck == null ? "didAnswerQuestion" : "didFinalAnswer";
    // Add an event listener for the didAnswerQuestion event
    window.addEventListener(eventToObserve, function(e) {
        // Check if the answer was correct or not by looking for the correct attribute
        let correct = document.querySelector(".quiz-input__input-container[correct='true']") !== null;

        // Push value to correct history array: 1 if correct, 0 if incorrect
        correctHistory.push(correct);

        // Increment the questions answered and correct/incorrect counters
        questionsAnswered++;
        if (currentQuestionType === "meaning") {
            correct ? meaningCorrect++ : meaningIncorrect++;
        } else if (currentQuestionType === "reading") {
            correct ? readingCorrect++ : readingIncorrect++;
        }
        if (correct) itemsCorrect++;
        else itemsIncorrect++;
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
            reading = [null, null, null];
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

        currentSRSLevel = quizQueueSRS.find(function(element) { return element[0] == e.detail.subject.id; })[1];
        if(currentSRSLevel == null) {
            getQuizQueueSRS();
            currentSRSLevel = quizQueueSRS.find(function(element) { return element[0] == e.detail.subject.id; })[1];
            if(currentSRSLevel == null) currentSRSLevel = 10;
        }
    });

    // Add an event listener for the turbo before-visit event
    window.addEventListener("turbo:before-visit", function(e) {       
        showStatistics();
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
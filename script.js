document.addEventListener('DOMContentLoaded', function () {
    initiate();
});

/**
 * @function initiate
 * This is the code initiator and creates the timerObject, which persists the 
 * objects. 
 */
function initiate() {
    var timeToRepeat = document.getElementById('time-to-repeat');
    var timerObject = {
        activeTimer: null,
        endTime: 0,
        startTime: 0,
        timeToRepeat: timeToRepeat,
        audioSound: new Audio('./blip.mp3'),
        resetNumber: parseFloat(timeToRepeat.value).toFixed(2),
        currentInterval: document.getElementById('current-interval'),
        timeRemaining: document.getElementById('time-remaining'),
        lastRing: document.getElementById('last-ring'),
        buttonStart: document.getElementById('start-interval'),
        buttonStop: document.getElementById('stop-interval'),
        buttonReset: document.getElementById('reset-interval'),
        tickTime: 10, // Accurate to 10 milliseconds
        displayTicks: 200, // Display every 200ms
        volume: 50
    };

    // These 3 click listeners are structured this way since I changed the 
    // code so many times. I suppose I could just write setTimer.bind
    // directly, but previous iterations processed a bit of code on click.
    timerObject.buttonStart.addEventListener('click', (function (timerObject) {
        setTimer(timerObject);
    }).bind(null, timerObject));

    timerObject.buttonStop.addEventListener('click', (function (timerObject) {
        stopTimer(timerObject);
    }).bind(null, timerObject));

    timerObject.buttonReset.addEventListener('click', (function (timerObject) {
        resetTimer(timerObject);
    }).bind(null, timerObject));

    // Custom code for "enter" key. This handles a toggle case for the input
    // 1) If there's no active timer, then start a timer. 
    // 2) If there's already an active timer, reset.
    var inputInterval = document.getElementById('time-to-repeat');
    inputInterval.addEventListener('keypress', (function (timerObject, e) {
        if (e.code == 'Enter') {
            if (timerObject.activeTimer) {
                resetTimer(timerObject);
            } else {
                setTimer(timerObject);
            }
        }
    }).bind(null, timerObject));

    // The rest of this function sets up the initial "Current Interval" 
    // and "Time Remaining". Refreshing while having a value in the input will
    // persist the value in FireFox (at least). This handles that initial case.

    // In this case, if it was blank, the "default" value will be 5 seconds.
    var repeatValue = timerObject.resetNumber;
    if (!repeatValue || isNaN(repeatValue)) {
        timerObject.timeToRepeat.value = '3';
        repeatValue = (3).toFixed(2);
    }
    replaceElementWithText(timerObject.timeRemaining, repeatValue)
    replaceElementWithText(timerObject.currentInterval, repeatValue);

    // Dark theme toggle
    var themeToggler = document.getElementById('light-theme');
    handleThemeToggle(themeToggler);

    // Volume Slider
    var volumeControl = document.getElementById('volume-control');
    handleVolumeControlEvent(timerObject, volumeControl);

    document.getElementById('start-interval').click();
}

/**
 * @function setTimer creates the looping timer and is the core functionality
 * @param {object} timerObject Timer object with all the timer information
 * How this timer works:
 * When the button is pressed, it gets the current time. 
 * This uses epoch time, so it's in milliseconds (ms)
 * Assume starting point START = 100,000ms and interval = 5,000ms
 * It also gets the ENDING time, so ENDING = 105,000ms
 * Every (tickTime)ms (which is timerObject.tickTime, hardcoded), check 
 * current epoch time. 
 * 
 * If we've passed the ENDING, then:
 * 1. Play a noise
 * 2a. If the "Stop after next ring" is checked, then stop. Lazy evaluated.
 * 2b. Reassign the ENDING as 5,000ms on the old ENDING, 
 *      so 105,000ms + 5,000ms = 110,000ms epoch time. 
 * 
 * This should be the most consistent method, since it calculates the 
 * ending immediately and checks for it. 
 */
function setTimer(timerObject) {
    // If there's an existing timer and the user presses "Start",
    // the old timer will be deleted and the new timer will start counting
    // from the new value immediately
    if (timerObject.activeTimer) { clearInterval(timerObject.activeTimer); }
    timerObject.resetNumber = parseFloat(
        timerObject.timeToRepeat.value).toFixed(2);
    
    replaceElementWithText(timerObject.currentInterval, 
        timerObject.resetNumber);
    
    // Plays when you press "Start" to give feedback
    timerObject.audioSound.play();
    timerObject.audioSound.volume = timerObject.volume / 100;
    console.log(timerObject);
    timerObject.currentStartTime = Date.now();
    timerObject.currentEndTime = timerObject.currentStartTime + 
                                    timerObject.resetNumber * 1000;

    // This is the heavy lifting. This just CHECKS. 
    var timer = window.setInterval((function (timerObject) {
        var currentTime = Date.now();
        if (timerObject.currentEndTime <= currentTime) {
            timerObject.audioSound.load();
            timerObject.audioSound.play();
            volumeControl(timerObject.audioSound, timerObject.volume)
            console.log(timerObject);
            // Handles 2a, "Stop after next ring" is checked. 
            // This is lazy loaded, so if it rings twice, then you check it,
            // it'll stop after the next ring
            if (timerObject.lastRing.checked) {
                resetTimer(timerObject);
                return;
            }
            // 2b. re-assign the start and ending times. Using 
            // timerObject.resetNumber to ensure the #s were set in stone
            timerObject.currentStartTime = timerObject.currentEndTime;
            timerObject.currentEndTime = timerObject.currentStartTime 
                + timerObject.resetNumber * 1000;
        }

        // "tick" just displays the values in the DOM
        tick(timerObject, currentTime)

        timerObject.activeTimer = timer;
        return;
    }).bind(null, timerObject), timerObject.tickTime);

    return timer;
}

/**
 * @function stopTimer Clears the interval, nulls the timer
 * @param {object} timerObject 
 * You might want to see what time you stopped at, for whatever reason
 * There's currently no way to RESUME... Yet?
 */
function stopTimer(timerObject) {
    if (timerObject.activeTimer) {
        window.clearInterval(timerObject.activeTimer);
        timerObject.activeTimer = null;
    }
    return;
}

/**
 * @function resetTimer Will stop the timer and reset the DOM
 * @param {object} timerObject
 * This will stop the timer and fill into the DOM the current #time-to-repeat
 */

function resetTimer(timerObject) {
    stopTimer(timerObject);
    timerObject.resetNumber = 
        parseFloat(timerObject.timeToRepeat.value).toFixed(2);

    replaceElementWithText(timerObject.currentInterval, 
        timerObject.resetNumber);
    replaceElementWithText(timerObject.timeRemaining, 
        timerObject.resetNumber);
    return;
}

/**
 * @function tick Displays the current timer in the #time-remaining
 * @param {object} timerObject 
 * @param {int} currentTime Maintain consistency by passing it in
 */
function tick(timerObject, currentTime) {
    // Change the DOM every 200ms, but calculate time every 10ms.
    // Only show clean numbers by calculating clean tick windows
    var lastDigitTime = (timerObject.currentEndTime - currentTime) 
                            % timerObject.displayTicks;
    var halfTickTime = timerObject.tickTime / 2;
    if (lastDigitTime < halfTickTime 
        || timerObject.displayTicks - halfTickTime < lastDigitTime ) {
        var displayedTime = 
            ((timerObject.currentEndTime - Date.now()) / 1000).toFixed(2);
    
        replaceElementWithText(timerObject.timeRemaining, displayedTime);
    }
    return;
}

/**
 * @function replaceElementWithText Displays the current timer in the 
 *                                  #time-remaining
 * @param {HTMLElement} element HTMLElement for the text, will 
 *                              CLEAR and then ADD
 * @param {string} text String which you want to show in the element
 */
function replaceElementWithText(element, text) {
    var tn = document.createTextNode(text);
    element.innerHTML = '';
    element.appendChild(tn);
    return;
}

function handleThemeToggle(themeToggler) {
    themeToggler.addEventListener('change', function () {
        if (this.checked) {
            document.getElementsByTagName('body')[0].classList = "";
        } else {
            document.getElementsByTagName('body')[0].classList = "dark";
        }
    });
}

function handleVolumeControlEvent(timerObject, element) {
    element.addEventListener('change', function (e) {
        timerObject.volume = e.target.value;
    });
}

function volumeControl(audio, volume) {
    audio.volume = volume / 100;
    return;
}

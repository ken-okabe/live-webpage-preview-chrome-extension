
const Timeline = (initialValue) => ({
    lastVal: initialValue,
    _fns: [],
    next: function (a) {
        nextT(a)(this);
    },
    bind: function (monadf) {
        return bindT(monadf)(this);
    },
    map: function (f) {
        return mapT(f)(this);
    },
    unlink: function () {
        unlinkT(this);
    }
});
const nextT = a => timeline => {
    timeline.lastVal = a;
    timeline._fns.forEach(f => f(a));
};
const bindT = (monadf) => (timelineA) => {
    const timelineB = monadf(timelineA.lastVal);
    const newFn = (a) => {
        const timeline = monadf(a);
        nextT(timeline.lastVal)(timelineB);
    };
    timelineA._fns.push(newFn);
    return timelineB;
};
const mapT = (f) => (timelineA) => {
    const timelineB = Timeline(f(timelineA.lastVal));
    const newFn = (a) =>
        nextT(f(a))(timelineB);
    timelineA._fns.push(newFn);
    return timelineB;
};
const unlinkT = timelineA =>
    timelineA._fns = [];

const port = 8777;

console.log("hello from extension");
let targetTabId = null;
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http://localhost:' + port.toString())) {
        if (targetTabId === null) {  // 初めて開かれたタブの場合
            targetTabId = tabId;
            console.log("target tab opened");

            let intervalId; // setIntervalのIDを保持する変数を宣言

            fetch('http://localhost:' + port.toString() + '/count')
                .then(response => response.text())
                .then(count => {
                    const countTimeline = Timeline(count);
                    console.log("initial count: " + count);

                    intervalId = setInterval(() => { // setIntervalのIDをintervalIdに代入
                        fetch('http://localhost:' + port.toString() + '/count')
                            .then(response => response.text())
                            .then(newCount => {
                                if (countTimeline.lastVal !== newCount) {
                                    console.log("count changed: " + newCount)
                                    chrome.tabs.reload(tabId);
                                    countTimeline.next(newCount);
                                }
                            })
                            .catch(error => console.error('Error fetching count:', error));
                    }, 1000);
                })
                .catch(error => console.error('Error fetching initial count:', error));
        } else if (targetTabId !== tabId) { // リロードされたタブの場合
            // 何もしない
        }
    }

    // タブが閉じられたときに targetTabId をリセット & intervalIdをクリア
    chrome.tabs.onRemoved.addListener(function (closedTabId) {
        if (closedTabId === targetTabId) {
            targetTabId = null;
            clearInterval(intervalId);
        }
    });
});
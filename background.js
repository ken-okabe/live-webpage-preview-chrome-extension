
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

const port = 8777; console.log("hello from extension");

let targetTabIds = []; // 対象のタブIDを保持する配列
let intervalId; // setIntervalのIDを保持する変数

// HTTPサーバからcountを取得してTimelineを初期化
function initializeCountTimeline() {
    fetch('http://localhost:' + port.toString() + '/count')
        .then(response => response.text())
        .then(count => {
            const countTimeline = Timeline(count);
            console.log("initial count: " + count);

            intervalId = setInterval(() => {
                fetch('http://localhost:' + port.toString() + '/count')
                    .then(response => response.text())
                    .then(newCount => {
                        if (countTimeline.lastVal !== newCount) {
                            console.log("count changed: " + newCount);
                            targetTabIds.forEach(tabId => chrome.tabs.reload(tabId)); // 全ての対象タブをリロード
                            countTimeline.next(newCount);
                        }
                    })
                    .catch(error => console.error('Error fetching count:', error));
            }, 1000);
        })
        .catch(error => console.error('Error fetching initial count:', error));
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http://localhost:' + port.toString())) {
        if (!targetTabIds.includes(tabId)) {  // まだ配列に含まれていないタブの場合
            targetTabIds.push(tabId);
            console.log("target tab opened");
            chrome.tabs.update(tabId, { autoDiscardable: false });

            if (targetTabIds.length === 1) {  // 最初のタブが開かれたときに初期化
                initializeCountTimeline();
            }
        }
    }
});

// タブが閉じられたときに targetTabId を配列から除去 & intervalIdをクリア
chrome.tabs.onRemoved.addListener(function (closedTabId) {
    targetTabIds = targetTabIds.filter(tabId => tabId !== closedTabId);
    if (targetTabIds.length === 0) {  // 全ての対象タブが閉じられたらインターバルをクリア
        clearInterval(intervalId);
    }
});
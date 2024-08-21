
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

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http://localhost:' + port.toString())) {
        // localhost:8777 が開かれたタブに対してのみ
        console.log("target tab opened");
        // HTTPサーバからcountを取得してTimelineを初期化
        fetch('http://localhost:' + port.toString() + '/count')
            .then(response => response.text())
            .then(count => {
                const countTimeline = Timeline(count);
                console.log(count);
                // 500msおきのインターバルでcountを監視
                setInterval(() => {
                    fetch('http://localhost:' + port.toString() + '/count')
                        .then(response => response.text())
                        .then(newCount => {
                            if (countTimeline.lastVal !== newCount) {
                                chrome.tabs.reload(tabId);
                                countTimeline.next(newCount); // Timelineの値を更新
                            }
                        })
                        .catch(error => console.error('Error fetching count:', error));
                }, 1000);
            })
            .catch(error => console.error('Error fetching initial count:', error));

    }
});
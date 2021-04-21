//canvas element
const ctx = document.getElementById('chart').getContext('2d');

/**
 * Graph-data
 */
var data = [];
var labels = [];
var playersOnline = [];
var playersMax = [];

/**
 * Bound library elements
 */
var noUiSliderElement = null;
var canvasElement = null;

/**
 * Slider
 */
var slider = document.getElementById('slider');
var start = 0;
var end = 0;

/**
 * Graph 
 */
const showTitle = true
const graphTitle = "Minecraft"
const showLabels = true;
const graphLabelOnline = "Players online"
const graphLabelMax = "Player limit"

/**
 * Footer "Players" content
 */
const footer = (tooltipItems) => {
    if(tooltipItems[0].datasetIndex == 1) {
        var id = tooltipItems[0].dataIndex + start
        var playersNames = data[id].playersNames;
        return "Players: \n- " + playersNames.join("\n- ");
    }
    return ""
};

/**
 * initializes graph
 * 
 * get Data and Draws it
 * 
 * if 2 or more datapoints are given it calculates the next timestamp on which data will be ready
 * and it calculates the interval between the timestamps
 * 
 * then it uses reload() every time new data is avaliable
 */
console.groupCollapsed("Initialization")
console.log("Initializing...")
 getDataAndDraw(true, ()=> {
    if(data.length>1){
        console.log("Initializing data...")
        var last = [data[data.length-2], data[data.length-1]];
        var interval = last[1].timestamp - last[0].timestamp;
        var nextTimestamp = last[1].timestamp + interval
        var start = ((nextTimestamp) - new Date().getTime() + 1000);
        console.log(`Next timestamp is ${nextTimestamp} waiting ${start}ms for first request, reload invertal is ${interval}ms`)
        console.groupEnd();
        setTimeout(()=> {
            console.log("Initializing reload cycle...")
            setInterval(reload, interval);
            reload();
        }, start)
    }
});

/**
 * reloads the data shown and sets the slider accordingly
 */
function reload() {
    console.log("Reloading...")
    var setEnd = end == labels.length-1;
    getDataAndDraw(false);
    if(setEnd) setSlider(start, end+1);
}


/**
 * uses getData() to retreive new data. if is has retreived new data, it draws the graph
 * 
 * 
 * @params {boolean} restartSlider if the slider should be set to 0-end position on reload so everything is drawn 
 * @params {function} callback is called after ready
 */
function getDataAndDraw(restartSlider, callback) {
    getData((hasChanged)=>{
        if(hasChanged) {
            if(restartSlider) {
                start = 0;
                end = labels.length-1
            }
            if(labels.length <= 1) {
                alert("Data is invalid, please wait");
                return;
            }
            setSlider(start, end);
            drawGraph(start, end);
            if(callback) callback()
        }
    })
}

/**
 * Sets the slider position and length
 * 
 * @param {number} _start the start position of the slider
 * @param {number} _end the end position of the slider
 */
function setSlider(_start, _end) {

    console.log(`Drawing slider for range [${_start}-${_end}]`)

    //set global start and end
    start = _start;
    end = _end;

    //unbind slider
    if(noUiSliderElement) noUiSliderElement.destroy();

    //bind slider
    noUiSliderElement = noUiSlider.create(slider, {
        start: [_start, _end],
        connect: true,
        step: 1,
        range: {
            'min': 0,
            'max': labels.length-1
        }
    })
    noUiSliderElement.on("set", (e)=> {
        drawGraph(parseInt(e[0]), parseInt(e[1]))
    })
}

/**
 * Formats a number to 2 digits (adds 0 if < 10)
 * 
 * @param {number} number the number to format
 * @returns {string} the formated number
 */
function format(number) {
    if(number < 10) return "0" + number;
    return number;
}

/**
 * Gets the json-data from the endpoint
 * Processes Label-timestamps to times
 * Saves data in data, labels, playersOnline, playersMax
 * 
 * @params {function} callback(hasChanged) is called when data is ready. hasChanged is, if the data has changed since the last getData
 */
function getData(callback) {
    console.log("Getting data...")
    $.get("?json=true", (_data) => { //gets json data

        console.log("Received data", JSON.parse(JSON.stringify(_data)));

        //inits empty arrays
        var _labels = [];
        var _playersOnline = [];
        var _playersMax = [];
        
        for(var i = 0; i<_data.length; i++) {
            var dataset = _data[i];

            //process timestamp
            var date = new Date(dataset.timestamp);
            var time = `${format(date.getDate())}.${format(date.getMonth()+1)}.${date.getFullYear()}, ${format(date.getHours())}:${format(date.getMinutes())}`;

            //saves in arrays
            _labels.push(time);
            _playersOnline.push(dataset.playersOnline);
            _playersMax.push(dataset.playersMax);
        }

        //if data has changed
        var hasChanged = labels.length != _labels.length;

        //sets to global arrays
        data = _data;
        labels = _labels;
        playersOnline = _playersOnline;
        playersMax = _playersMax

        //emit ready
        callback(hasChanged);
    });
}

/**
 * Draws the graph based on the data given from the global arrays labels, playersMax and playersOnline
 * The start end end parameters are both included and the index of the arrays
 * 
 * @params {number} _start the stating index to draw (included)
 * @params {number} _end the ending index to draw (included)
 */
function drawGraph(_start, _end) {

    console.log(`Drawing graph for range [${_start}-${_end}]`)

    //sets start and end
    start = _start;
    end = _end;

    //set slider position
    setSlider(_start, _end);

    //the data to show (start to end)
    var labelsProcessed = labels.filter((val, index) => {return index >=_start && index <= _end});
    var playersMaxProcessed = playersMax.filter((val, index) => {return index >=_start && index <= _end});
    var playersOnlineProcessed = playersOnline.filter((val, index) => {return index >=_start && index <= _end});

    //the data to build the graph
    var data = {
        type: 'line',
        data: {
            labels: labelsProcessed,
            datasets: [{
                label:graphLabelMax,
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: playersMaxProcessed,
                tension: 0.3,
            },{
                label:graphLabelOnline,
                backgroundColor: 'rgb(0, 99, 132)',
                borderColor: 'rgb(0, 99, 132)',
                data: playersOnlineProcessed,
                tension: 0.3,
            }],
        },
        options: {
            responsive: true,
            onresize: ()=> {
                function beforePrintHandler () {
                    for (var id in Chart.instances) {
                        Chart.instances[id].resize()
                    }
                }
            },
            plugins: {
                legend: {
                    display: showLabels,
                    position: 'top',
                },
                title: {
                    display: showTitle,
                    text: graphTitle
                },
                tooltip: {
                    callbacks: {
                        footer: footer,
                    }
                }
            }
        }
    }

    //if canvas is already initialized
    if(canvasElement) {

        var max = Math.max(canvasElement.data.labels.length, data.data.labels.length);
        for(var i = 0; i < max; i++) {
            //go through all datasets
            
            //if data is available to set at this point -> set it
            if(data.data.labels[i]) {
                canvasElement.data.labels[i] = data.data.labels[i];
                canvasElement.data.datasets[0].data[i] = data.data.datasets[0].data[i];
                canvasElement.data.datasets[1].data[i] = data.data.datasets[1].data[i];
            } else {
                //no data is available -> remove elements
                canvasElement.data.labels.splice(-1, 1);
                canvasElement.data.datasets[0].data.splice(-1, 1);
                canvasElement.data.datasets[1].data.splice(-1, 1);
            }
        }
        canvasElement.update();
    } else {
        //new canvas
        canvasElement = new Chart(ctx, data);
    }
    
}
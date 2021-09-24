function hxlProxyToJSON(input, headers) {
    var output = [];
    var keys = []
    input.forEach(function (e, i) {
        if (i == 0) {
            e.forEach(function (e2, i2) {
                var parts = e2.split('+');
                var key = parts[0]
                if (parts.length > 1) {
                    var atts = parts.splice(1, parts.length);
                    atts.sort();
                    atts.forEach(function (att) {
                        key += '+' + att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function (e2, i2) {
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}


var title = '<h1 class="header">Cash Based Programming in Somalia<span class="pull-right"><a href="https://data.humdata.org/dataset/cash-based-programming-in-somalia-2018" target="_blank">See the dataset on HDX</a></span></h1>';
var titleProj = '<h1 class="header">Cash Based Programming in Somalia - MPCA Projections</h1>';

var colorScaler = d3.scale.ordinal().range(['#DDDDDD', '#A7C1D3', '#71A5CA', '#73A9D9', '#8CBCD2', '#3B88C0', '#056CB6']);
var colorScalerProj = d3.scale.ordinal().range(['#C7EEEB', '#8FDFD9', '#1EBFB3', '#168F86', '#0B4742']);

var colorScaler3 = d3.scale.ordinal().range(['#DDDDDD', '#A7C1D3', '#71A5CA', '#3B88C0']);
var colorScaler3Proj = d3.scale.ordinal().range(['#C7EEEB', '#8FDFD9', '#1EBFB3', '#168F86']);

var mapCols = ['#DDDDDD', '#A7C1D3', '#71A5CA', '#3B88C0', '#056CB6'];
var mapColsProj = ['#C7EEEB', '#8FDFD9', '#1EBFB3', '#168F86', '#0B4742'];

var globalColor = "#3B88C0";

var config = {
    mostUpdatedCode: "0",
    lastUpdateMonth: "May",
    lastUpdateYear: "2017",
    lastDataURL:'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PZuC-Kf206kUcizDhz9qtWPR7hvc9hlfDJwirNbaPbk%2Fedit%23gid%3D1685091410',
    whoFieldName: "#org",
    whatFieldName: "#sector",
    whereFieldName: "#adm2+code",
    sumField: "#beneficiary",
    donors : "#org+donor",
    geo: "data/Somalia_District_Polygon.json",
    joinAttribute: "DIS_CODE",
    nameAttribute: "DIST_NAME",
    color: globalColor,
    mapColorRange: mapCols,
    colorScale : colorScaler,
    colorScale3: colorScaler3,
    mechanismField: "#indicator+mechanism",
    conditonalityField: "#indicator+conditionality",
    restrictionField: "#indicator+restriction",
    ruralField: "#loc+type",
    transferValue: "#value+total"
};
var globalMonthlyData = {},
    cashData,
    cashDataForIPC,
    geom,
    settings = {};

var monthlyMonths = ['x'],
    monthlyBeneficiaries = ['Beneficiaries'],
    monthlyTransfer = ['Total value transferred'];

var formatComma = d3.format(',');
var formatDecimalComma = d3.format(",.0f");


var somAdm2LocLink = 'data/somAdm2.json';
var somAdm2Loc ;


var ipcData;

var mapsvg, 
    g,
    projection;

var pctRawData,
    pctCoverageData;

var fillCircle = '#418FDE';
var fillcolor = '#dddddd';
var ipcStressed = '#fae61e';
var ipcStressedRange = ['#fefad2','#fdf5a5','#fcf078','#fbeb4b','#fae61e'];

var ipcCrisis = '#e67800';
var ipcCrisisRange = ['#fae4cc','#f5c999','#f0ae66','#eb9333','#e67800'];
var ipcEmergency = '#c80000';
var ipcEmergencyRange = ['#f4cccc','#e99999','#de6666','#d33333','#c80000'];


/**  Get settings sheet where all hxl proxy links of monthly data are stored
 * on complete set in config most recent month and year and initiate getting most 
 * recent cash data
 * */
var initSettings = (function(){
    $.ajax({
        type: 'GET',
        //test
         url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PZuC-Kf206kUcizDhz9qtWPR7hvc9hlfDJwirNbaPbk%2Fedit%23gid%3D575563760&force=on',
        //production
       // url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PZuC-Kf206kUcizDhz9qtWPR7hvc9hlfDJwirNbaPbk%2Fedit%23gid%3D0&force=on',
        format: 'json',
        async: false,
        success: function(args){
            var dataSettings = hxlProxyToJSON(args);
            dataSettings.forEach( function(element) {
                settings[element['#meta+code']] = {'month':element['#date+month+name'],'year':element['#date+year'],'value':element['#value'],'beneficiaries':element['#beneficiary'],'link':element['#meta+link'], 'overview': element['#meta+description']};
                monthlyMonths.push(element['#date+month']);
                monthlyBeneficiaries.push(element['#beneficiary']);
                monthlyTransfer.push(element['#value']);
                //globalMonthlyData[element['#meta+code']] = {'date':element['#month'],'link':element['#meta+link']};
            });
        },
        complete: function(){
            initConfig();
            initCashData(config.lastDataURL);
        }
    });

})();


/* Get last entry of the settings sheet and add to config :
 the hxl proxy link
 month
 year
*/
function initConfig() {
    var bigger = 1;

    for (key in settings){
        var current = parseFloat(key);
        current >= bigger ?  bigger = current : '';
    } 
    if (bigger =='undefined') {
        config.mostUpdatedCode = 201710 ;
        config.lastDataURL = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PZuC-Kf206kUcizDhz9qtWPR7hvc9hlfDJwirNbaPbk%2Fedit%23gid%3D1685091410' ;
    } else {
        config.mostUpdatedCode = bigger ;
        config.lastDataURL = settings[bigger].link ;
        config.lastUpdateMonth = settings[bigger].month ;
        config.lastUpdateYear = settings[bigger].year ;
    }
    
} //end of initConfig


/*Creates crossfilter object of the given link parameter
sets the gloabal monthly cash crossfilter object, the dimension and the group on adm2 and total beneficiaries
used for IPC data
and a nested data object for % coverage map
*/
function initCashData(dataLink) {
    var dataCash = (function(){
    var a;
    $.ajax({
        type: 'GET',
        url: dataLink,
        format: 'json',
        async: false,
        success: function(dataArgs){
            a = hxlProxyToJSON(dataArgs);
        }
    });
    return a;
    })();
    cashDataForIPC = dataCash;
    cashData = crossfilter (dataCash); 
    cashIPCDim = cashData.dimension(function(d){ return d['#adm2+code']; });
    cashIPCGroup = cashIPCDim.group().reduceSum(function(d){ return d["#beneficiary"]; }).top(Infinity);
    
    pctRawData = d3.nest()
            .key(function(d){
                return d['#adm2+code'];
            })
            .key(function(d){
                return d['#sector'];
            })
            .rollup(function(v) { 
                return d3.sum(v, function(d){ 
                    return Number(d[config.sumField]); 
                })
            })
            .entries(dataCash);

} //end of initCashData


// on filter sets configs month and year
$('.monthSelectionList option').filter(function(){
    return $(this).text() == config.lastUpdateMonth;
}).prop('selected', true);

$('.yearSelectionList option').filter(function(){
    return $(this).text() == config.lastUpdateYear;
}).prop('selected', true);



function getSomAdm2Loc() {
    somAdm2Loc = (function(){
        var data;
        $.ajax({
            type: 'GET',
            url: somAdm2LocLink,
            format: 'json',
            async: false,
            success: function(adm2){
                data = adm2;
            }
        });
        return data;
    })(); 
    
}//getSomAdm2Loc 



function showMapTooltip(d, maptip, text, data){
    var mouse = d3.mouse(mapsvg.node()).map( function(d) { return parseInt(d); } );
    maptip.html('');

    if(data == undefined) {
        maptip
            .classed('hidden', false)
            .attr('style', 'left:'+(mouse[0]+20)+'px;top:'+(mouse[1]+20)+'px')
            .html(text)
    } else {
        
        var pie = d3.select('.map-tip')
                .append('button').attr('type', 'button').attr('class', 'btn-close')
                .attr('id', "close").attr('onclick', "hideMapTooltip(maptip);")
                .text("Close");
                
        d3.select('.map-tip').append('h5').text(text)
                    .append('div').attr('id', 'donut');
        
        maptip
        .classed('hidden', false)
        .attr('style', 'left:'+(mouse[0]+20)+'px;top:'+(mouse[1]+20)+'px')
        
        c3.generate({
            bindto: "#donut",
            size: {width: 200, height: 150},
            data: {
                columns: data,
                type : 'pie',
                colors: {
                    'MPCA' : pieMPCAColor, 
                    'Safety Nets': pieSafetyNetsColor,
                    'Sectoral Cash': pieSectoralCashColor
                }
            },
            pie: {
                label: {
                    threshold: 0.05
                }
            }
        });
    }

}

function hideMapTooltip(maptip) {
    maptip.classed('hidden', true) 
}

function filterWhatChart (item) {
    var inc = false;
    var arr = whatChart.filters();
    for (var i = 0; i < arr.length; i++) {
        if(item['#sector'] == arr[i]){
            inc = true;
            break;
        } 
    }
    return inc;
}

var ipcRangePeriod = 'jul_sep';
var ipcRangePeriodGlobal = "";

var cashIPCDim, 
    cashIPCGroup;

function getIPCRangePeriod(month) {
    var IPCperiod;

    ['January', 'February', 'March'].includes(month) ? IPCperiod = 'jan_mar' : 
    ['April', 'May', 'June'].includes(month) ? IPCperiod = 'apr_jun' :
    ['July', 'August', 'September'].includes(month) ? IPCperiod = 'jul_sep' :
    ['October', 'November', 'December'].includes(month) ? IPCperiod = 'oct_dec' : '';
    
    return IPCperiod;
}//getIPCRangePeriod

function getPreviousIPCRangePeriod(month) {
    // var monthNum = {
    //     1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June", 
    //     7:"July", 8: "August", 9: "September", 10:"October", 11: "November", 12: "December"
    // }
    

    // var prevNum = Number(datesDic[month])-1;
    // prevNum == 0 ? prevNum = 12 : null ;

    // var previousMonth = monthNum[prevNum];


    var previousRange = 'oct_dec';

    ['October', 'November', 'December'].includes(month) ? previousRange = 'jul_sep' :
    ['July', 'August', 'September'].includes(month) ? previousRange = 'apr_jun' :
    ['April', 'May', 'June'].includes(month) ? previousRange = 'jan_mar' : null;

    return previousRange;
    
} //getPreviousIPCRangePeriod

function getCoverageData(){
    pctCoverageData = {};
    pctRawData.forEach(element => {
        var mpca = 0, 
            safetyNets = 0, 
            sectoralCash = 0, 
            total = 0;
        element.values.forEach(item => {
            item.key == "MPCA" ? mpca += item.values :
            item.key == "Safety Nets" ? safetyNets += item.values : sectoralCash += item.values ;
        });
        total = mpca + safetyNets + sectoralCash;
        pctCoverageData[element.key] = {'MPCA': mpca, 'Safety Nets': safetyNets, 'Sectoral Cash': sectoralCash};
    });
}//mergeCoverageData

function mergeIPCPinData() {
    var yr = '2020'; 
    var label = '';
    var ipcValidy = 'July-Septembre 2020';

    var month = $('.monthSelectionList').val();
    var year = $('.yearSelectionList').val();

    ipcRangePeriod = getIPCRangePeriod(month);
        
    ipcRangePeriod == 'jan_mar' ? ipcValidy = 'January-March ' : 
    ipcRangePeriod == 'apr_jun' ? ipcValidy = 'April-June ' : 
    ipcRangePeriod == 'jul_sep' ? ipcValidy = 'July-September ' : 
    ipcRangePeriod == 'oct_dec' ? ipcValidy = 'October-December ' : null;

    if (["2018", "2019"].includes(year)) {
        ipcRangePeriod = 'jan_mar' ;
        label = ipcRangePeriod+'_'+"2020";
        ipcRangePeriodGlobal = ipcRangePeriod+'_'+"2020";
        ipcValidy = "January-March 2020";
    } else {
        label = ipcRangePeriod+'_' + year;
        ipcRangePeriodGlobal = ipcRangePeriod+'_'+year;
        ipcValidy += year;

        // var ipcDataRow0 = ipcData[0];

        // if(ipcDataRow0['all_'+ipcRangePeriodGlobal] == undefined) {
        //     var gotAGoodRange = false;
        //     var previousRange = getPreviousIPCRangePeriod(month);
        //     console.log("previous range ipc: " +previousRange);
        //     // while(!gotAGoodRange){

        //     //     newRange = getIPCRangePeriod()
        //     //     gotAGoodRange = true;
        //     // }
        // }

        // console.log(ipcRangePeriodGlobal)
        // var previousRange = getPreviousIPCRangePeriod(month);
        // console.log("previous range ipc: " +previousRange);
        // console.log(ipcDataRow0['all_'+ipcRangePeriodGlobal])

    }

    // console.log(ipcData)

    ipcData.forEach( function(element, index) {
        var pct_all = null,
            pct_stressed = null,
            pct_crisis = null,
            pct_emergency = null;

        for (var i = 0; i < cashIPCGroup.length; i++) {
            if(cashIPCGroup[i].key == element.code){
                var reached = Number(cashIPCGroup[i].value);
                var ipcStress = Number(element['stressed_'+label]);
                var ipcCris = Number(element['crisis_'+label]);
                var ipcEmer = Number(element['emergency_'+label]);
                element['#beneficiaries'] = reached;
                (ipcStress == 0) ? ipcStress = reached : '';
                ipcCris == 0 ? ipcCris = reached : '';
                ipcEmer == 0 ? ipcEmer = reached : '';
                pct_stressed = Number(((reached*100)/ipcStress).toFixed(2));
                pct_crisis = Number(((reached*100)/ipcCris).toFixed(2));
                pct_emergency = Number(((reached*100)/ipcEmer).toFixed(2));
                
                pct_stressed > 100 ? pct_stressed = 100 : '';
                pct_crisis > 100 ? pct_crisis = 100 : '';
                pct_emergency > 100 ? pct_emergency = 100 : '';
            }
         }
        element['#percentage+stressed'] = pct_stressed;
        element['#percentage+crisis'] = pct_crisis;
        element['#percentage+emergency'] = pct_emergency;
    });
    $('#ipcMapTitle h6').text('Cash Assistance coverage - Assistance versus need (IPC '+ipcValidy+')');
} //mergeIPCPinData

function getMax(phase) {
    var label;
    phase == undefined ? label = '#percentage+stressed' :
    phase == 'stressed' ? label = '#percentage+stressed' :
    phase == 'crisis' ? label = '#percentage+crisis' : label = '#percentage+emergency';

    var max = d3.max(ipcData, function(d){
        return d[label];
    });
    return max;

}//getMax

var pieMPCAColor = '#F2645A',
    pieSafetyNetsColor = '#1EBFB3',
    pieSectoralCashColor = globalColor;

var mpcaRange = ['#fce0de', '#fac1bd', '#f7a29c', '#f5837b', '#F2645A'],
    safetyNetsRange = ['#d2f2f0', '#a5e5e1', '#78d9d1', '#4bccc2' ,'#1EBFB3'],
    sectoralCashRange = ['#d8e7f2', '#b1cfe6', '#89b8d9', '#62a0cd' ,'#3B88C0'];

function choroplethCoverageMap(cashType) {
    $('#ipcMapTitle h6').text("Hover over a district to see the ratio for MCPA, Safety Nets, and Sectoral Cash");
    var colLabel = "MPCA";
    var range = mpcaRange ;

    if (cashType == undefined) {
        // range = mpcaRange ;
        // colLabel = "MPCA";
        $("input[name='MPCA']").prop('checked', true);
        $("input[name='Safety Nets']").prop('checked', false);
        $("input[name='Sectoral Cash']").prop('checked', false);
    } else if (cashType == "Safety Nets") {
        range = safetyNetsRange;
        colLabel = "Safety Nets";
    } else if (cashType == "Sectoral Cash"){
        range = sectoralCashRange;
        colLabel = "Sectoral Cash";
    }

    var maxValue = 0;
    for (k in pctCoverageData) {
        pctCoverageData[k][colLabel] > maxValue ? maxValue = pctCoverageData[k][colLabel] : null;
    }

    var pctCoverageColorScale = d3.scale.quantize()
        .domain([0, 100])
        .range(range);
    // test colorScale
    // console.log(pctCoverageColorScale(16));

     mapsvg.selectAll('path').each( function(element, index) {
        d3.select(this).transition().duration(500).attr('fill', function(d){
            var filtered = pctCoverageData[parseInt(d.properties.DIS_CODE)];
            var num = null;
            filtered != undefined ? num =  filtered[colLabel] : null ; 
            var clr = (num == null) ? '#ccc' : pctCoverageColorScale(Math.round((num*100)/maxValue));
            return clr;
        });
    });

    var legend = d3.legend.color()
      .labelFormat(d3.format(',.0f'))
      .title("Legend")
      .cells(range.length -1 )
      .scale(pctCoverageColorScale);
 
     d3.select('#legend').remove();

    var div = d3.select('#ipcmap');
    var svg = div.append('svg')
        .attr('id', 'legend')
        .attr('height', '120px');
    
    svg.append('g')
      .attr('class', 'scale')
      .call(legend);
} // choroplethCoverageMap

function choroplethIPCMap(phase) {
    var pctLabel ;
    var range ;

    if (phase == undefined) {
        pctLabel = '#percentage+stressed';
        range = ipcStressedRange ;
        $("input[name='stressed']").prop('checked', true);
        $("input[name='crisis']").prop('checked', false);
        $("input[name='emergency']").prop('checked', false);
    } else if (phase == 'stressed' ) {
        pctLabel = '#percentage+stressed';
        range = ipcStressedRange ;
    } else if (phase == 'crisis') {
        pctLabel = '#percentage+crisis';
        range = ipcCrisisRange;
    } else {
        pctLabel = '#percentage+emergency';
        range = ipcEmergencyRange;
    }

    var ipcColorScale = d3.scale.quantize()
            .domain([0, 100])
            .range(range)
    
     mapsvg.selectAll('path').each( function(element, index) {
        d3.select(this).transition().duration(500).attr('fill', function(d){
            var filtered = ipcData.filter(pt => pt.code== d.properties.DIS_CODE);
            var num = filtered[0][pctLabel] ;
            var clr = (num == null) ? '#ccc' : ipcColorScale(num);
            return clr;
        });
    });

    var legend = d3.legend.color()
      .labelFormat(d3.format(',.0f'))
      .title("Legend")
      .cells(range.length -1 )
      .scale(ipcColorScale);
 
    d3.select('#legend').remove();

    var div = d3.select('#ipcmap');
    var svg = div.append('svg')
        .attr('id', 'legend')
        .attr('height', '120px');
    
    svg.append('g')
      .attr('class', 'scale')
      .call(legend);
} // choroplethIPCMap

var maptip ;
var mapDataSelect = d3.select('#ipcmap').append('div')
    .attr('class', 'ipcLegend')
    .style('bottom', 10)
    .style('right', 10);

function initiateGlobalMap (){
    var width = 490;
    var height = 400;
    var mapScale = width*3.2;

    projection = d3.geo.mercator()
      .center([47, 5])
      .scale(mapScale)
      .translate([width / 2, height / 2]);

    var path = d3.geo.path().projection(projection);

    mapsvg = d3.select('#ipcmap').append("svg")
        .attr("width", width)
        .attr("height", height);

    maptip = d3.select('#ipcmap').append('div').attr('class', 'd3-tip map-tip hidden');

    g = mapsvg.append("g").attr('id', 'adm2')
              .selectAll("path")
              .data(geom.features)
              .enter()
                .append("path")
                .attr('d',path)
                .attr('id', function(d){ 
                    return d.properties.DIS_CODE; 
                })
                .attr('fill', '#FFF')
                .attr('stroke-width', 1)
                .attr('stroke', '#7d868d');
    
    // getSomAdm2Loc();
    getCoverageData();
    choroplethCoverageMap();
    mapsController(true);

} //initiateGlobalMap


$('input[type=radio][name=ipcMapAndCoverage]').change(function(){
    var coverageMapSelected = $("#pct").is(':checked') ;
    
    d3.select('#legend').remove();

    if(coverageMapSelected){
        choroplethCoverageMap();
    } else {
        mergeIPCPinData();
        choroplethIPCMap();
    }

    mapsController(coverageMapSelected);
});

function mapsController(coverageMap){
    mapDataSelect.html('');

    var inputsIPC = '<input type="checkbox" checked name="stressed"> IPC 3+<br>'+
        '<input type="checkbox" name="crisis"> IPC 4+<br>'+
        '<input type="checkbox" name="emergency"> IPC 5';
    
    var inputCoverage = '<input type="checkbox" checked name="MPCA"> MPCA<br>'+
        '<input type="checkbox" name="Safety Nets"> Safety Nets<br>'+
        '<input type="checkbox" name="Sectoral Cash"> Sectoral Cash';
    

    if (coverageMap) {
        // make sure IPC map unchecked
        // $("input[name='ipcMapAndCoverage']").prop('checked', false);
        
        // percentage coverage map
        mapDataSelect.html(inputCoverage);

        d3.select('#adm2').selectAll('path')
        .on('mousemove', function(d){
            var filtered = pctCoverageData[parseInt(d.properties.DIS_CODE)];
            var txt = '';
            var keys = ['MPCA', 'Safety Nets', 'Sectoral Cash'];
            var pieData = [];
            if (filtered != undefined) {
                keys.forEach(element => {
                    var arr = [];
                    if (filtered[element] != 0) {
                        arr.push(element);
                        arr.push(filtered[element]);
                        pieData.push(arr);
                    }
                });
                txt = d.properties.DIST_NAME+' ('+d.properties.REG_NAME+')';
                showMapTooltip(d, maptip, txt, pieData);
            } 
        })
        .on('mouseout', function(){
            // hideMapTooltip(maptip);
        });
    } else {
        //IPC map
        mapDataSelect.html(inputsIPC);
        text = '<h6>% of People in need: 100%</h6>'+
            '<h6>% of People reached: 100%</h6>'+
            '<h6>Population: 12345</h6>';

        d3.select('#adm2').selectAll('path')
        .on('mousemove', function(d){
            var filtered = ipcData.filter(pt => pt.code== d.properties.DIS_CODE);
    
            var label = '';
            // $("input[name='all']").is(":checked") ? label +='all':
            $("input[name='stressed']").is(":checked") ? label = 'stressed' :
            $("input[name='crisis']").is(":checked") ? label +='crisis':
            $("input[name='emergency']").is(":checked") ? label +='emergency': ''
    
            var pct = filtered[0]['#percentage+'+label];
            var pin = filtered[0][label+'_'+ipcRangePeriodGlobal]
            var txt = '<h5>'+d.properties.DIST_NAME+' ('+d.properties.REG_NAME+')</h5>'+
                '<h6>% of People reached: <strong>'+pct+'</strong></h6>'+
                '<h6> People in Need: <strong>'+pin+'</strong></h6>';
    
            showMapTooltip(d, maptip, txt);
        })
        .on('mouseout', function(){
            hideMapTooltip(maptip);
        });
    }
// IPC map data toggle
    $("input[name='stressed']").change(function() {
        if(this.checked) {
            $("input[name='crisis']").prop('checked', false);
            $("input[name='emergency']").prop('checked', false);
            choroplethIPCMap('stressed');
        }
    });

    $("input[name='crisis']").change(function() {
        if(this.checked) {
            $("input[name='stressed']").prop('checked', false);
            $("input[name='emergency']").prop('checked', false);
            choroplethIPCMap('crisis');
        }
    });

    $("input[name='emergency']").change(function() {
        if(this.checked) {
            $("input[name='stressed']").prop('checked', false);
            $("input[name='crisis']").prop('checked', false);
            choroplethIPCMap('emergency');
        }
    });

    // Coverage map data toggle
    $("input[name='MPCA']").change(function() {
        if(this.checked) {
            $("input[name='Safety Nets']").prop('checked', false);
            $("input[name='Sectoral Cash']").prop('checked', false);
            choroplethCoverageMap("MPCA");
        }
    });

    $("input[name='Safety Nets']").change(function() {
        if(this.checked) {
            $("input[name='MPCA']").prop('checked', false);
            $("input[name='Sectoral Cash']").prop('checked', false);
            choroplethCoverageMap("Safety Nets");
        }
    });

    $("input[name='Sectoral Cash']").change(function() {
        if(this.checked) {
            $("input[name='MPCA']").prop('checked', false);
            $("input[name='Safety Nets']").prop('checked', false);
            choroplethCoverageMap("Sectoral Cash");
        }
    });

} //mapsController


function generateOverviewText(id) {
    var mpcaText = "The MPCA reporting also captures expected cash coverage per month (average) for next 6 months. This is mapped in relation to need (IPC projection) to provide a good overview on the extent to which programming needs to be scaled up. At the top right hand side, under Month and Year, kindly select upcoming months to view expected MPCA programming for that month.";
    var text = (id==undefined) ? mpcaText : settings[id].overview ;
    $('#overview span').text(text);
}

var formatDecimal = function (d) {
    ret = d3.format(".3f");
    return "$ " + ret(d);
};
var formatDecimalAVG = function (d) {
    ret = d3.format(".1f");
    return "$ " + ret(d);
};
var formatMoney = function (d) {
    return "$ " + formatDecimalComma(d);
};

function checkIntData(d){
    return (isNaN(parseInt(d)) || parseInt(d)<0) ? 0 : parseInt(d);
};

var whatChart,
    whoChart,
    whoRegional,
    donorChart,
    filterMechanismPie,
    filtercondPie,
    filterRestPie,
    filterRuralUrban;

function generate3WComponent() {
    var lookup = genLookup();

    whoChart = dc.rowChart('#hdx-3W-who');
    whatChart = dc.rowChart('#hdx-3W-what');
    donorChart = dc.rowChart('#hdx-3W-donor');
    var whereChart = dc.leafletChoroplethChart('#hdx-3W-where');

    whoRegional = dc.rowChart('#regionalCash');

    filterMechanismPie = dc.pieChart('#filterMechanism');
    filtercondPie = dc.pieChart('#filterConditionality');
    filterRestPie = dc.pieChart('#filterRestriction');
    filterRuralUrban = dc.pieChart('#filterArea');
    var numOfPartners = dc.numberDisplay('#numberOfOrgs');
    var amountTransfered = dc.numberDisplay('#amountTransfered');
    var peopleAssisted = dc.numberDisplay('#peopleAssisted');

    // var cashData = crossfilter(data);


    var whoRegionalDim = cashData.dimension(function (d) {
        return d["#adm1+name"];
    });

    var whoDimension = cashData.dimension(function (d) {
        return d[config.whoFieldName];
    });

    var whatDimension = cashData.dimension(function (d) {
        return d[config.whatFieldName];
    });

    var donorDimension = cashData.dimension(function(d){
        return d[config.donors];
    });

    var mpcaFilter = whatDimension.filter("MPCA").top(Infinity);
    whatDimension.filterAll();

    var whereDimension = cashData.dimension(function (d) {
        return d[config.whereFieldName];
    });

    var dimMecha = cashData.dimension(function (d) {
        return d[config.mechanismField];
    });
    var dimCond = cashData.dimension(function (d) {
        return d[config.conditonalityField];
    });
    var dimRest = cashData.dimension(function (d) {
        return d[config.restrictionField];
    });
    var dimRuralUrban = cashData.dimension(function (d) {
        return d[config.ruralField];
    });

    var whoRegionalGroup = whoRegionalDim.group().reduceSum(function (d) {
        return d[config.sumField]
    });

    var groupMecha = dimMecha.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });

    var groupCond = dimCond.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });

    var groupRest = dimRest.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });

    var groupRuralUrban = dimRuralUrban.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });


    var whoGroup = whoDimension.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });

    var whatGroup = whatDimension.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });

    var whereGroup = whereDimension.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });

    var donorGroup = donorDimension.group().reduceSum(function(d){
        return parseInt(d[config.sumField]);
    });

    var all = cashData.groupAll();

    var gp = cashData.groupAll().reduce(
        function (p, v) {
            p.peopleAssisted += +v[config.sumField];
            p.amountTransfered += +v[config.transferValue];
            if (v[config.whoFieldName] in p.orgas)
                p.orgas[v[config.whoFieldName]]++;
            else {
                p.orgas[v[config.whoFieldName]] = 1;
                p.numOrgs++;
            }

            return p;
        },
        function (p, v) {
            p.peopleAssisted -= +v[config.sumField];
            p.amountTransfered -= +v[config.transferValue];
            
            p.orgas[v[config.whoFieldName]]--;
            if (p.orgas[v[config.whoFieldName]] == 0) {
                delete p.orgas[v[config.whoFieldName]];
                p.numOrgs--;
            }

            if (p.peopleAssisted < 0) p.peopleAssisted = 0;
            if (p.amountTransfered < 0) p.amountTransfered = 0;

            return p;
        },
        function () {
            return {
                peopleAssisted: 0,
                amountTransfered: 0,
                numOrgs: 0,
                orgas: []
            };

        }
    );

    var mpcaNumOrgs = [];
    for (var i = 0; i < mpcaFilter.length; i++) {
        mpcaNumOrgs.includes(mpcaFilter[i]['#org']) ? '' : mpcaNumOrgs.push(mpcaFilter[i]['#org']);
    }

    var numO = function (d) {
        var val = (config.sumField=='#beneficiary') ? d.numOrgs : mpcaNumOrgs.length;
        return val;
    };


    var amount = function(d){
        var val = (config.sumField=='#beneficiary') ? d.amountTransfered : 0 ;
        return val;
    }

    var peopleA = function(d){
        return d.peopleAssisted;
    }


    numOfPartners.group(gp)
        .valueAccessor(numO)
        .formatNumber(formatDecimalComma);

    amountTransfered.group(gp)
        .valueAccessor(amount)
        .formatNumber(formatMoney);

    peopleAssisted.group(gp)
        .valueAccessor(peopleA)
        .formatNumber(formatDecimalComma);

    //tooltip
    var rowtip = d3.tip().attr('class', 'd3-tip').html(function (d) {
        return d.key + ': ' + d3.format('0,000')(d.value);

    });

    //tooltip
    var slicetip = d3.tip().attr('class', 'd3-tip').html(function (d) {
        return d.data.key + ': ' + d3.format('0,000')(d.value);
    });


    filterMechanismPie.width(190)
        .height(190)
        .radius(80)
        .innerRadius(40)
        .dimension(dimMecha)
        .group(groupMecha)
        .colors(config.colorScale)
        .title(function (d) {
            return;
        });
    
    // filterMechanismPie.on('filtered', function(chart, filter){
    //     if (chart.hasFilter()) {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     } else {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     }
    // });

    filtercondPie.width(190)
        .height(190)
        .radius(80)
        .innerRadius(40)

        .dimension(dimCond)
        .group(groupCond)
        .colors(config.colorScale)
        .title(function (d) {
            return ;
        });

    // filtercondPie.on('filtered', function(chart, filter){
    //     if (chart.hasFilter()) {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     } else {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     }
    // });

    filterRestPie.width(190)
        .height(190)
        .radius(80)
        .innerRadius(40)

        .dimension(dimRest)
        .group(groupRest)
        .colors(config.colorScale3)
        .title(function (d) {
            return;
        });
    
    // filterRestPie.on('filtered', function(chart, filter){
    //     if (chart.hasFilter()) {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     } else {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     }
    // });

    filterRuralUrban.width(190)
        .height(190)
        .radius(80)
        .innerRadius(40)

        .dimension(dimRuralUrban)
        .group(groupRuralUrban)
        .colors(config.colorScale3)
        .title(function (d) {
            return;
        });

    // filterRuralUrban.on('filtered', function(chart, filter){
    //     if (chart.hasFilter()) {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     } else {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     }
    // });

    whoChart.width($('#hxd-3W-who').width()).height(450)
        .dimension(whoDimension)
        .group(whoGroup)
        .elasticX(true)
        .data(function (group) {
            return group.top(15);
        })
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function (d, i) {
            return 0;
        })
        .xAxis().ticks(5);
    
    // whoChart.on('filtered', function(chart, filter){
    //     if (chart.hasFilter()) {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     } else {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     }
    // });

    whatChart.width($('#hxd-3W-what').width()).height(400)
        .dimension(whatDimension)
        .group(whatGroup)
        .elasticX(true)
        .data(function (group) {
            return group.top(15);
        })
        .labelOffsetY(31)
        .colors([config.color])
        .colorAccessor(function (d) {
            return 0;
        })
        .xAxis().ticks(5);
        

    // whatChart.on('filtered', function(chart, filter){
    //     if (chart.hasFilter()) {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     } else {
    //         mergeIPCPinData();
    //         choroplethIPCMap();
    //     }
    // });

    donorChart.width($('#hxd-3W-chart').width()).height(400)
    .dimension(donorDimension)
    .group(donorGroup)
    .elasticX(true)
    .data(function (group) {
        return group.top(15);
    })
    .labelOffsetY(31)
    .colors([config.color])
    .colorAccessor(function (d) {
        return 0;
    })
    .xAxis().ticks(5);


    whoRegional.width($('#whoRegional').width()).height(450)
        .dimension(whoRegionalDim)
        .group(whoRegionalGroup)
        .elasticX(true)
        .data(function (group) {
            return group.top(17);
        })
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function (d) {
            return 0;
        })
        .xAxis().ticks(5);

    dc.dataCount('#count-info')
        .dimension(cashData)
        .group(all);
    
    whereChart.width($('#hxd-3W-where').width()).height(400)
        .dimension(whereDimension)
        .group(whereGroup)
        .center([0, 0])
        .zoom(0)
        .geojson(geom)
        .colors(config.mapColorRange)
        .colorDomain([0, 4])
        .colorAccessor(function (d) {
            var c = 0
            if (d > 150000) {
                c = 4;
            } else if (d > 50000) {
                c = 3;
            } else if (d > 1000) {
                c = 2;
            } else if (d > 0) {
                c = 1;
            };
            return c
        })
        .featureKeyAccessor(function (feature) {
            return feature.properties['DIS_CODE'];

        }).popup(function (feature) {
            text = lookup[feature.key] + "<br/>No. Beneficiaries : " + formatComma(feature.value);

            return text;
        })
        .renderPopup(true);

    $('.loader').hide();
    $('.container').css('opacity', 1);
    
    dc.renderAll();

    d3.selectAll('g.row').call(rowtip);
    d3.selectAll('g.row').on('mouseover', rowtip.show).on('mouseout', rowtip.hide);

    d3.selectAll('g.pie-slice').call(slicetip);
    d3.selectAll('g.pie-slice').on('mouseover', slicetip.show).on('mouseout', slicetip.hide);

    var map = whereChart.map();
    zoomToGeom(geom);
    map.options.minZoom = 5;
    map.options.maxZoom = 7;
    function zoomToGeom(geom) {
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([
            [bounds[0][1], bounds[0][0]],
            [bounds[1][1], bounds[1][0]]
        ]);
    }

    function genLookup() {
        var lookup = {};
        geom.features.forEach(function (e) {
            lookup[e.properties['DIS_CODE']] = String(e.properties['DIST_NAME']);
        });
        return lookup;
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    } 

}// gin generate3WComponent

function generateLineCharts(x, data1, data2, bindTo){
   c3.generate({
        bindto: bindTo,
        size: {
            height: 180
        },
        data: {
            x: 'x',
            columns: [
            x,
            data1,
            data2
            ]
        },
        axis: {
            x: {
                type: 'timeseries',
                //localtime: false,
                tick: {
                    //count:6,
                    format: '%b %Y'
                }
            },
            y: {
                tick: {
                    count:6,
                    format: d3.format('.2s')
                }
            }
        },
        tooltip: {
            format: {
                value: d3.format(',')
            }
        }

    });

} //fin generateLineCharts

var datesDic = {
        'January':'01',
        'February':'02',
        'March':'03',
        'April':'04',
        'May':'05',
        'June':'06',
        'July':'07',
        'August':'08',
        'September':'09',
        'October':'10',
        'November':'11',
        'December':'12'
};

function generateKeyFigures (mm, yy) {
    var id = String(yy)+datesDic[mm];
    $("#peopleAssisted").text(formatComma(parseFloat(settings[id].beneficiaries)));
    $("#amountTransfered").text(formatMoney(parseFloat(settings[id].value)));
    
} //fin generateKeyFigures



$('#update').on('click', function(){
    config.sumField = '#beneficiary';
    config.color = globalColor;
    config.mapColorRange = mapCols;
    config.colorScale = colorScaler;
    config.colorScale3 = colorScaler3;
    $('.title').html(title);
    $('h1.header').css('color', '#000');
    $('#amountTransfered, .number-display').html();

    var month = $('.monthSelectionList').val();
    var year = $('.yearSelectionList').val();
    var id = String(year)+datesDic[month];
    
    if (settings[id] != undefined) {
        // $('.container').css('opacity', 0);
        $('.loader').show();
        generateOverviewText(id);
        initCashData(settings[id].link);
        generate3WComponent();
        // mergeIPCPinData();
        // choroplethIPCMap();
        getSomAdm2Loc();
        getCoverageData();
        choroplethCoverageMap();
        mapsController(true);
    } else{
        var mois = parseInt(datesDic[config.lastUpdateMonth]);
        var annee = parseInt(config.lastUpdateYear);
        for (var i = 1; i < 7; i++) {
            mois += 1;
            if (mois >12) {
                mois = 1;
                annee += 1;
            }     
        }
        var projEndPeriod = "" ;
        mois <= 9 ? projEndPeriod = String(annee) + "0"+mois : projEndPeriod = String(annee) +mois;

        id = config.lastUpdateYear+datesDic[config.lastUpdateMonth];
        var selectedPeriod = String(year)+datesDic[month];

        if (selectedPeriod <= projEndPeriod) {
            config.sumField = '#targeted+'+month.toLowerCase();
//             config.transferValue = config.sumField;
            config.color = '#1EBFB3';
            config.mapColorRange = mapColsProj;
            config.colorScale = colorScalerProj;
            config.colorScale3 = colorScaler3Proj;
            $('.title').html(titleProj);
            $('h1.header').css('color', '#1EBFB3');
            $('.loader').show();
            $('#peopleAssisted h4').html('People assisted (Planned)');
            
            generateOverviewText();
            initCashData(settings[id].link);
            generate3WComponent();
            // mergeIPCPinData();
            // choroplethIPCMap();
            choroplethCoverageMap();
            mapsController(true);
        } else {
            $('#myModal').modal('show');

            generateOverviewText(id);
            initCashData(settings[id].link);
            generate3WComponent();
            // mergeIPCPinData();
            // choroplethIPCMap();
            choroplethCoverageMap();
            mapsController(true);
            $('.monthSelectionList').val(config.lastUpdateMonth);
            $('.yearSelectionList').val(config.lastUpdateYear);
        }

    }

})

var monthlyCall = $.ajax({
    type: 'GET',
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PZuC-Kf206kUcizDhz9qtWPR7hvc9hlfDJwirNbaPbk%2Fedit%23gid%3D1868352423&force=on',
    dataType: 'json'
})

var geomCall = $.ajax({
    type: 'GET',
    url: 'data/Somalia_District_Polygon.json',
    dataType: 'json',
});

var ipcDataCall = $.ajax({
    type: 'GET',
    // url: 'https://proxy.hxlstandard.org/data.json?dest=data_edit&strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1XTibmkKIt3B_05AqbLyJ7v6d47185Y-E6XLE-_jteRk%2Fedit%23gid%3D0',
    url: 'https://proxy.hxlstandard.org/api/data-preview.json?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1XTibmkKIt3B_05AqbLyJ7v6d47185Y-E6XLE-_jteRk%2Fedit%23gid%3D2139334860&format=objects.json',
    dataType: 'json',
});

var yearsDropdownDataCall = $.ajax({
    type: 'GET',
    url: 'https://proxy.hxlstandard.org/data.objects.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PZuC-Kf206kUcizDhz9qtWPR7hvc9hlfDJwirNbaPbk%2Fedit%23gid%3D340989934&force=on',
    dataType: 'json',
});

$.when(ipcDataCall, geomCall, yearsDropdownDataCall).then(function (ipc, geomArgs, years) {
    $('.title').html(title);
    
    var yOpt = '';
    for (var i = 0; i < years[0].length; i++) {
        var an = years[0][i]['#date+year'];
        var curr = years[0][i]['#meta+current'];
        curr == "YES" ? yOpt +='<option value="' + an +'" selected>' + an + '</option>' : yOpt +='<option value="' + an +'">' + an + '</option>';
        
    }

    $('.yearSelectionList').append(yOpt);

    var month = $('.monthSelectionList').val();
    var year = $('.yearSelectionList').val();
    var id = String(year)+datesDic[month];

    ipcData = ipc[0];//hxlProxyToJSON(ipc[0]);
    geom = geomArgs[0];


    generateOverviewText(id)
    generateLineCharts(monthlyMonths,monthlyBeneficiaries, monthlyTransfer, '#yearlyChart');
    generate3WComponent();

    initiateGlobalMap();
});

// fin

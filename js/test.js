// var dates = {1: {'link':'lien1', 'value':'val1'}, 2: {'link':'lien2', 'value':'val2'}};

// //console.log(dates.date1.link)

// dates[3] = {'link':'lien3', 'value': 'val3'};
// //dates.date4 = 'lien4'
// //console.log(dates)
// var yy = 2017;
// var mm = 'June' ;
// var datesDic = {
//     'January':1,
//     'February':2,
//     'March':3,
//     'April':4,
//     'May':5,
//     'June':6,
//     'July':7,
//     'August':8,
//     'September':9,
//     'October':10,
//     'November':11,
//     'December':12
// };

// //console.log(String(datesDic[mm]))
// var lastDate;
// for (date in dates){
//     lastDate = dates[date];
//     console.log(lastDate)
// }

// console.log(lastDate.link)

var map = L.map('map');

function createMap (argument) {

    if (map != undefined) {
           map.remove();
       }
      // var map = L.map('map').setView([51.505, -0.09], 13);
      map = L.map('map').setView([51.505, -0.09], 13);


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([51.5, -0.09]).addTo(map)
        .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
        .openPopup();
}


$('.select').on('change', function(){


    createMap();
});

$('document').ready(function(){
    createMap();
})
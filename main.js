// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

// node main.js --excel=WorldCup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require('minimist');
let axios = require('axios');
let jsdom = require('jsdom');
let excel = require('excel4node');
let pdf = require('pdf-lib');

let args = minimist(process.argv);

let responsePromise = axios.get(args.source);     // Getting data from the source
responsePromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matchScoreDiv = document.querySelectorAll('div.match-score-block');
    // console.log(matchScoreDiv.length);

    let matches = []; // An array in which all the scraped information will be pushed

    for(let i = 0; i < matchScoreDiv.length; i++){
        let match = { // Object
            
        };
        
        let namePs = matchScoreDiv[i].querySelectorAll('p.name');
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;  

        let scoreSpan = matchScoreDiv[i].querySelectorAll('div.score-detail > span.score');
        match.t1s = "";
        match.t2s = "";

        if(scoreSpan.length == 2){     // Special Case, to check if the match was abandoned or was not completed.
            match.t1s = scoreSpan[0].textContent;
            match.t2s = scoreSpan[1].textContent;
        }else if(scoreSpan.length == 1){
            match.t1s = scoreSpan[0].textContent;
            match.t2s = "";
        match.t2s = "";
        }else{
            match.t1s = "";
            match.t2s = "";
        }

        let result = matchScoreDiv[i].querySelector('div.status-text > span');
        match.result = result.textContent;

        matches.push(match);
        // console.log(i); -> To get to the check point where the code was breaking.
    }

    console.log(matches);

}).catch(function(err){
    console.log(err);
})


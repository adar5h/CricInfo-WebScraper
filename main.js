// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

// node main.js --excel=WorldCup.csv --dataFolder=data --url=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require('minimist');
let axios = require('axios');
let jsdom = require('jsdom');
let excel = require('excel4node');
let pdf = require('pdf-lib');

let args = minimist(process.argv);

let responsePromise = axios.get(args.url);
responsePromise.then(function(response){

    // if(response.statusCode != 200){
    //     return;
    // }

    /* How a browser functions. Because the browser knows HTTP,
     but axios makes a request object and
    gives us the response along with other resources like status code etc.  */



    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    
    let matchDivs = document.querySelectorAll('div.match-score-block'); // Will give an array of the selected query's given div.

    let matches = [];

    for(let i = 0; i < matchDivs.length; i++){

        let matchDiv = matchDivs[i];
        let match = { 
            
            t1: "",
            t2: "",
            t1Score: "",
            t2Score: "",
            result: ""
        };

        let teamPs = matchDiv.querySelectorAll('p.name');
        match.t1 = teamPs[0].textContent;
        match.t2 = teamPs[1].textContent;

        let tScore = matchDiv.querySelectorAll('div.score-detail > span.score');
        
        // console.log(i); // At 30th block we have a value where the match was abandoned. Thus there is no score value. To deal with this type of problem.
        // We use basic logics like 

        if(tScore.length == 2){
            match.t1Score = tScore[0].textContent;
            match.t2Score = tScore[1].textContent;
        }else if(tScore.length == 1){
            match.t1Score = tScore[0].textContent;
            match.t2Score = "";
        }else{
            match.t1Score = "";
            match.t2Score = "";
        }

        let conclusion = matchDiv.querySelector('div.status-text > span'); // Just query selector because result is obviously the same for both the teams. Lame I know, but being lame in beginning makes you good at it.
        match.result = conclusion.textContent;


        matches.push(match);
        

    }
    console.log(matches);

})



















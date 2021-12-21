// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

// node main.js --excel=WorldCup.csv --dataFolder=PDFs --url=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require('minimist');
let axios = require('axios');
let jsdom = require('jsdom');
let excel = require('excel4node');
let pdf = require('pdf-lib');
let fs = require("fs");
let path = require("path");

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

    let matchesDiv = document.querySelectorAll('div.match-score-block');
    // console.log(matchesDiv.length);

    let matches = []; // An Array

    for(let i = 0; i < matchesDiv.length; i++){

        let match = { // An Object
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        }

        let team = matchesDiv[i].querySelectorAll('div.name-detail > p.name');
        match.t1 = team[0].textContent;
        match.t2 = team[1].textContent;

        let tScores = matchesDiv[i].querySelectorAll('div.score-detail > span.score');

        if(tScores.length == 2){ // Special Case to handle the cases where only one team played and the match got cancelled or none of the teams played.
            match.t1s = tScores[0].textContent;
            match.t2s = tScores[1].textContent;
        }else if(tScores.length == 1){
            match.t1s = tScores[0].textContent;
            match.t2s = "";
        }else{
            match.t1s = "";
            match.t2s = "";
        }


        let result = matchesDiv[i].querySelector('div.status-text > span');
        match.result = result.textContent;

        matches.push(match);
    }


    // Now we have an array 'matches' filled with objects of all the matches which is in JSO form.
    // But to read, write we have to convert JSO to JSON, and that is done using JSON.stringify();
    let MatchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", MatchesJSON, "utf-8");
    // matches.json will be created and filled with all the matches details, but in the flat form.

    let teams = [];

    for(let i = 0; i < matches.length; i++){
        putTeaminTeams(teams, matches[i].t1);
        putTeaminTeams(teams, matches[i].t2);

        putMatchesinAppropriateTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
        putMatchesinAppropriateTeam(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);
    }

    // for(let i = 0; i < matches.length; i++){
    //     putMatchesinAppropriateTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
    //     putMatchesinAppropriateTeam(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);
    // }

    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");

    createExcel(teams, args.excel); 
    createFoldersAndPdfs(teams, args.dataFolder);
    
})

function putTeaminTeams(teams, homeTeam){
    let tidx = -1;
    for(let i = 0; i < teams.length; i++){
            if(teams[i].name==homeTeam){
                tidx = i;
                break;
            }
    }

    if(tidx == -1){
        teams.push({
            name: homeTeam,
            matchesPlayed : []
        });
    }
}

function putMatchesinAppropriateTeam(teams, homeTeam, oppTeam, selfScore, oppScore, result){
    let tidx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == homeTeam){
            tidx = i;
            break;
        }
    }

   let team = teams[tidx];

   team.matchesPlayed.push({
       vs: oppTeam,
       selfS: selfScore,
       oppS: oppScore,
       result: result
   })
}

function createExcel(teams, Worldcup){

    let sheet = new excel.Workbook();

    for(let i = 0; i < teams.length; i++){
        let ws = sheet.addWorksheet(teams[i].name);

        ws.cell(1,1).string('Team');
        ws.cell(1,2).string('Opponent');
        ws.cell(1,3).string('Self_Score');
        ws.cell(1,4).string('Opp_Score');
        ws.cell(1,5).string('Result');

        for(let j = 0; j < teams[i].matchesPlayed.length; j++){
            ws.cell(2+j,1).string(teams[i].name);
            ws.cell(2+j,2).string(teams[i].matchesPlayed[j].vs);
            ws.cell(2+j,3).string(teams[i].matchesPlayed[j].selfS);
            ws.cell(2+j,4).string(teams[i].matchesPlayed[j].oppS);
            ws.cell(2+j,5).string(teams[i].matchesPlayed[j].result);
        }
    }

    sheet.write(Worldcup);

}

function createFoldersAndPdfs(teams, PDFs){

    if(fs.existsSync(PDFs)){ // Checks prior existence of folder
        fs.rmdirSync(PDFs, {recursive: true}); // Removes the content of the folder. ? -> 1. To make the code user friendly as the could should be re-runable. Not deleting will cause error.
    }                                          
    
    fs.mkdirSync(PDFs);

    for(let i = 0; i < teams.length; i++){
            let teamFolderName = path.join(PDFs, teams[i].name);
            fs.mkdirSync(teamFolderName);
    

    for(let j = 0; j < teams[i].matchesPlayed.length; j++ ){
        let match = teams[i];
        createPdf(teamFolderName, match.name, match.matchesPlayed[j]);
    }

}
}

function createPdf(teamFolderName, homeTeam ,match){

    let matchFileName = path.join(teamFolderName, match.vs);
    
    // The template has been made manually, the insertion in it would be through the code.
    let templateFileBytes = fs.readFileSync("Template.pdf"); // Getting the template file from the hardDisk to RAM, i.e. into bits&Bytes.
    let pdfPromise = pdf.PDFDocument.load(templateFileBytes);
    pdfPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(homeTeam ,{
            x: 320,
            y: 631,
            size:12
        })
        page.drawText(match.vs ,{
            x: 320,
            y: 611,
            size:12
        })
        page.drawText(match.selfS ,{
            x: 320,
            y: 591,
            size:12
        })
        page.drawText(match.oppS ,{
            x: 320,
            y: 571,
            size:12
        })
        page.drawText(match.result ,{
            x: 320,
            y: 551,
            size:12
        })

        // Styling
        // let form = pdfDoc.getform();
        // let string = form.textboxArea('_____') ;
        // string.setText('CricInfo WebScraper by Adarsh')
        // string.addToPage(page, {x: 55, y:640});

        page.drawText('CricInfo WebScraper by Adarsh' ,{  // Pseudo-Copyright, ;)
            x: 200,
            y: 400,
            size:12
        })

    

        let changedBytesPromise = pdfdoc.save();
        changedBytesPromise.then(function(changedBytes){
            if(fs.existsSync(matchFileName + ".pdf")){ // Special Case to check for more than 1 Match with same country otherwise the file would be overwritten.
                fs.writeFileSync(matchFileName + "1.pdf", changedBytes ,'utf-8');
            }else{
            fs.writeFileSync(matchFileName + ".pdf", changedBytes ,'utf-8');
            }
        })
    })


}



















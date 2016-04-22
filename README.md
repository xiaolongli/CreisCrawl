# CreisCrawl

## Usage
The crawling scripts must run in **Chrome** browser. To pull data for a city that is already listed in `cityInfos` array, follows the steps below:
*   Log into Creis website using Chrome.
*   In the same page, open developer console.
*   If not already, add `console.save.js` and `creis.crawl.js` as snippets.
*   Run the two snippets files.
*   In the console, type `run(i)`, where `i` is the index of the city in the `cityInfos` array.

When new cities' data are purchased, cityInfos array needs to be repopulated. To do so, following the steps below:
*   Make sure `console.save.js` and `creis.crawl.js` are loaded.
*   In the console, type `getPermittedCitys(function(cities) {console.log(JOSN.stringify(cities, null, 4))})`
*   The new city info array will be printed to the console, copy it into `creis.crawl.js` and replace the value of existing `cityInfos` variable.

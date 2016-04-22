var MAX_LINES = 50000;

var TIME_INTERVAL_MS = 5000;

var propertyTypeMap = {
    ALL: "'1','2'",
    APT: "'2'",
    SINGLE_HOUSE: "'1'"
};

var historyPriceRe = /var detailJson = (.*?)\s*?\<\/script\>/;

var cityInfos = [
    {
        "cityName": "长春",
        "cityId": "186c7fd9-07c2-4f50-bc36-52a130e25083",
        "landId": "220100"
    },
    {
        "cityName": "北京",
        "cityId": "6679b8fe-0231-4c3e-95e2-1afa9e3fea5f",
        "landId": "110100"
    },
    {
        "cityName": "石家庄",
        "cityId": "9a08213a-fce3-455a-8787-f13392c09f61",
        "landId": "130100"
    },
    {
        "cityName": "上海",
        "cityId": "52907f4c-7222-4b38-b50a-3d5346852b53",
        "landId": "310100"
    },
    {
        "cityName": "宁波",
        "cityId": "95bf06ba-8b21-4d63-ad47-9f449625a29d",
        "landId": "330200"
    },
    {
        "cityName": "深圳",
        "cityId": "c159b923-46aa-4be5-91ba-e9e3561141b1",
        "landId": "440300"
    },
    {
        "cityName": "三亚",
        "cityId": "e6228fd7-86d9-4c5e-86f9-9a8a0cdd3f82",
        "landId": "460200"
    },
    {
        "cityName": "郑州",
        "cityId": "14197f14-2b22-47b4-b1df-9764775d1668",
        "landId": "410100"
    },
    {
        "cityName": "西安",
        "cityId": "926123c5-6fc4-495e-8f9d-149c201ed933",
        "landId": "610100"
    },
    {
        "cityName": "银川",
        "cityId": "980e72b9-f44e-4357-8f30-8765f46e65ca",
        "landId": "640100"
    }
];

// The main entrance of the script. Fetch the first i-th city in cityInfos.
function run(i) {
    var cityInfo = cityInfos[i];
    fetchAllPropertyInfo(cityInfo.cityName, cityInfo.cityId, cityInfo.landId,
        function(allProperties) {
            // Save property information into a file as well.
            console.save(allProperties, cityInfo.cityName + '_' + 'propertyinfo.txt');

            var allPropertiesWithPid = allProperties.filter(
                function(element){
                    return element.pid;
                });
            fetchTradingDataForAllProperties(
                cityInfo.cityId,
                allPropertiesWithPid,
                undefined,
                'APT',
                cityInfo.cityName + '_sales_condo.txt');
            fetchTradingDataForAllProperties(
                cityInfo.cityId,
                allPropertiesWithPid,
                undefined,
                'SINGLE_HOUSE',
                cityInfo.cityName + '_sales_singlehouse.txt');
            fetchHistoricalPriceForAllProperties(
                allProperties,
                undefined,
                cityInfo.cityName + '_historical_price.txt');
        }
    );
}

// Get all permitted cities and invoke callback with an array of results.
// @param callback The function to call with permitted cities. The function should take
//                 an array of city information as parameter.
function getPermittedCitys(callback) {
    var url = '/Dictionaries/GetPermissionCity/?v=' + Math.random();
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'post',
        success: function (data) {
            var cities = data.city;
            var result = [];
            for (var i = 0; i < cities.length; i++) {
                if (cities[i].isShow !== "0") {
                    result.push({
                       cityName: cities[i].cityName,
                       cityId: cities[i].houseID,
                       landId: cities[i].landID
                    });
                }
            }
            callback(result);
            console.log("Got " + result.length + " permitted cities.");
        },
        error: function () {
            console.error("Failed to get permitted cities.");
        }
    });
}

// Fetch the information of all properties of a given city.
// @param cityName
// @param cityId
// @param landId
// @param callback The function to call with all properties. The function should take
//                 an array of property information as parameter.
function fetchAllPropertyInfo(cityName, cityId, landId, callback) {
    // var TOTAL_PROPERTY = 10420; // Total number of properties
    var PAGE_SIZE = 100;
    var MAX_PAGE = 30;
    var url = "/KeySearch/Search/";
    var param = {
        category: "2", // Zhuzhai
        isDealCityDistrict: "1",
        islogicparcelcode: 1,
        keyWord: "",
        pageIndex: 1,
        pageSize: PAGE_SIZE,
        rd: 21287.70150966919,
        sCityId: cityId,
        scityids: landId + ',' + cityId + ',' + cityId,
        sortKey: "keyword",
        sortType: "0",
    };

    var result = [];
    var pageIndex = 0;
    var allPageLoadStarted = false;
    var pendingRequest = 0;
    var totalPages = 0;

    var handle = setInterval(function() {
//         if (totalPages && pageIndex * PAGE_SIZE >= totalPages) {
//             clearInterval(handle);
//             allPageLoadStarted = true;
//         }
        if (pageIndex >= MAX_PAGE) {
            clearInterval(handle);
            allPageLoadStarted = true;
        }
        pageIndex++;
        param.pageIndex = pageIndex;
        pendingRequest++;
        $.ajax({
            type: "post",
            dataType: "json",
            url: url,
            data: param,
            success: jQuery.proxy(function (pageIndex, data) {
                pendingRequest--;
                var hits = jQuery.parseJSON(data).hits;
                if (totalPages == 0) {
                    totalPages = jQuery.parseJSON(data).allnum;
                }
                hits.forEach(function(element, index, array) {
                    if (element.category == '2') {
                        result.push({
                            id: element.id,
                            pid: element.pid,
                            title: decodeURIComponent(element.title)
                        });
                    }
                });
                console.log("Successfully read page " + pageIndex + " for city " + cityName);
                if (allPageLoadStarted && pendingRequest == 0) {
                    console.log("Finished loading property info for " + cityName);
                    callback(result);
                }
            }, this, pageIndex),
            error: jQuery.proxy(function(pageIndex, result) {
                pendingRequest--;
                console.error("Can not read page " + pageIndex + "for city " + cityName);
            }, this, pageIndex)
        });
    }, TIME_INTERVAL_MS);
};

// Fetch the trading data for given property id.
// @param cityId The ID of the city
// @param pid The property ID
// @param title The property Title
// @param array The array to append result to
// @param type One of "APT", "SINGLE_HOUSE" or "ALL"
// @param callback Callback to call after fetch is done
function fetchTradingDataForProperty(cityId, pid, title, array, type, callback) {
    var param = {
        bCloseAmount: false,
        bCloseArea: false,
        bClosePrice: false,
        iPageCount: "200",
        iPageIndex: "1",
        sAmount: "-1,0-500000,500000-800000,800000-1200000,1200000-1600000,1600000-2000000,2000000-3000000,3000000-5000000,5000000-999999999",
        sArea: "-1,0-60,60-90,90-120,120-160,160-200,200-300,300-400,400-99999999",
        sBeginDate: "1990-01-01",
        sCityID: cityId,
        sColType: "wu",
        sDateType: "month",
        sEndDate: "2016-03-01",
        sFenQi: "",
        sHuXing: "",
        sOrderIndex: "date",
        sOrderType: "desc",
        sOrdercol2TypeValue: "",
        sPrice: "-1,0-8000,8000-10000,10000-15000,15000-20000,20000-25000,25000-30000,30000-40000,40000-99999999",
        sPropertyID: pid,
        sRowType: "date",
        sViewType: "area",
        sWuYe: propertyTypeMap[type],
    };
    var paramString = $.toJSON(param);

    var url = '/Property/GetPropertyDealDetailAuto/';

    $.post(url, { jsonParameters: encodeURIComponent(paramString) }, function (msg) {
        if (!msg.Table) {
            console.error("No trading data(" + type + ") for " + title);
            callback();
            return;
        }

        var priceEntries = msg.Table;
        for (var i = 0; i < priceEntries.length; i++) {
            var entry = priceEntries[i];
            var roomNum = entry.iRoomNum;
            var roomArea = Math.round(entry.fRoomArea);
            var roomPrice = Math.round(entry.fRoomPrice);
            var roomAmount = Math.round(entry.fRoomAmout);
            var date = entry.col1TypeID;
            var data = [pid, title, date, roomNum, roomArea, roomPrice, roomAmount];
            array.push(data.join(', '));
        }
        console.log("Logged trading data(" + type + ") for " + title);
        callback();
    }, 'json');
};

// Fetch the trading data for the first n properties with given type and store in a file.
// The file will be a txt file, whose content is the stringified JSON array of the results.
// @param cityId The ID of the city
// @param allPropertiesWithPid An array of all properties' infomation, must have pid.
// @param n Number of properties to fetch, if n is larger than the total number of properties,
//          it will be clamped.
// @param type One of "APT", "SINGLE_HOUSE" or "ALL"
// @param filename The name of file to store the fetched results.
function fetchTradingDataForAllProperties(cityId, allPropertiesWithPid, n, type, filename) {
    if (!type in propertyTypeMap) {
        console.error("Unknown type of property: " + type);
        return;
    }

    var results = [];
    var currentFile = 0;
    results.push("pid, title, month, numberSold, areaSold, averagePrice, totalDealAmount");
    if (!n) {
        n = allPropertiesWithPid.length;
    } else {
        n = Math.min(n, allPropertiesWithPid.length);   
    }

    var fetchedResults = 0; // # of fetched results.
    var currentFetchIndex = 0; // Index of current fetch.
    var handle = setInterval(function() {
        if (currentFetchIndex >= n) {
           clearInterval(handle);
           setTimeout(function() {
               console.log("All " + n + " properties fetched, saving...");
               var fn = filename + '.' + currentFile;
               console.save(results, fn);
               console.log("File saved as " + fn);
           }, 10000);
           return;
        }
        
        var property = allPropertiesWithPid[currentFetchIndex];
        if (property.pid) {
            fetchTradingDataForProperty(
                cityId,
                property.pid,
                property.title,
                results,
                type,
                function() {
                    if (results.length >= MAX_LINES) {
                        console.log("Result is more than " + MAX_LINES + "lines, saving...");
                        var fn = filename + '.' + currentFile++;
                        console.save(results, fn);
                        console.log("File saved as " + fn);
                        results.length = 0;
                        results.push("pid, title, month, numberSold, areaSold, averagePrice, totalDealAmount");
                    }
                });
        }

        currentFetchIndex++;
    }, TIME_INTERVAL_MS * 2);
};

// Fetch historical price for a single property.
// @param title Title of the property.
// @param id ID of the property.
// @param pid Property ID of the property.
// @param result Array of result to append to.
// @param callback Callback to call after fetch is done.
function fetchHistoricalPrice(title, id, pid, result, callback) {
    $.get(
        "http://city.creis.fang.com/House/Detail",
        {
            instalmentid: id,
            propertyid: pid
        },
        function(data) {
            var dataString = historyPriceRe.exec(data);
            if (!dataString || !dataString[1]) {
                console.error("Failed to fetch history price for " + title);
            } else {
                var historyPrice = jQuery.parseJSON(dataString[1]).Table1;
                if (!historyPrice) {
                    console.error("Failed to fetch history price for " + title);
                } else {
                    for (var i = 0; i < historyPrice.length; i++) {
                        var data = [
                            id,
                            title,
                            historyPrice[i].dPriceDate,
                            historyPrice[i].fPriceAverage,
                            historyPrice[i].fPriceMin,
                            historyPrice[i].fPriceMax
                        ];
                        result.push(data.join(', '));
                    }
                    console.log("Successfully fetched history price for " + title);
                }
            }
            callback();
        },
        'html'
    );
}

function fetchHistoricalPriceForAllProperties(allProperties, n, filename) {
    if (!n) {
        n = allProperties.length;
    } else {
        n = Math.min(n, allProperties.length);   
    }

    var results = [];
    var currentFile = 0;
    results.push("id, title, date, averagePrice, minPrice, maxPrice");
    var fetchedResults = 0; // # of fetched results.
    var currentFetchIndex = 0; // Index of current fetch.
    var handle = setInterval(function() {
        if (currentFetchIndex >= n) {
           clearInterval(handle);
           setTimeout(function() {
               console.log("All " + n + " properties fetched, saving...");
               var fn = filename + '.' + currentFile++;
               console.save(results, fn);
               console.log("File saved as " + fn);
           }, 10000);
           return;
        }
        
        var property = allProperties[currentFetchIndex];
        fetchHistoricalPrice(
            property.title,
            property.id,
            property.pid,
            results,
            function() {
                if (results.length >= MAX_LINES) {
                    console.log("Result is more than " + MAX_LINES + "lines, saving...");
                    var fn = filename + '.' + currentFile++;
                    console.save(results, fn);
                    console.log("File saved as " + fn);
                    results.length = 0;
                    results.push("id, title, date, averagePrice, minPrice, maxPrice");
                }
            });

        currentFetchIndex++;
    }, TIME_INTERVAL_MS);
}
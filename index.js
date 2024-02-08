import TrackviaAPI, { log } from "trackvia-api"; // if installed through npm
import fetch from 'node-fetch';
import constants from "./constants.js";
import helper from "./sortCoords.js";

const {
    apiKey,
    accessToken,
    baseUrl,
    accountId,
    farmPlotsDefaultViewId,
    farmPlotCoordinatesDefaultViewID,
    coordinateToFarmPlotRelxFieldId,
} = constants;




export const handler = async (event) => {
    let api;

    try {
        api = new TrackviaAPI(apiKey, accessToken, baseUrl, accountId);
    } catch (err) {
        console.log("ERROR CREATING TRACKVIA API");
        return {
            statusCode: 401,
            message: "ERROR CREATING TRACKVIA API: " + err.message,
        };
    }

    let farmPlot;

    try {
        farmPlot = await api.getRecord(farmPlotsDefaultViewId, event.recordId);
    } catch (err) {
        console.log("COULD NOT FETCH FARM RECORD");
        return {
            statusCode: 404,
            message: "COULD NOT FETCH FARM RECORD: " + err.message,
        };
    }

    let forestResponse;
    let plotCenter;
    let sent2Response;



    try {
        let coordinates = await api.getView(
            farmPlotCoordinatesDefaultViewID,
            null,
            farmPlot.data["Record ID"]
        );

        const areaCoords = coordinates.data
            .filter((coordinate) => coordinate[`${coordinateToFarmPlotRelxFieldId}(id)`] === farmPlot.data.id)
            .map(({ Location }) => ({
                lat: Number(Location.latitude),
                lng: Number(Location.longitude),
            }));

        const sortedArray = helper.sortCoords(areaCoords);
        sortedArray.push(sortedArray[0]);
        plotCenter = helper.getCenter(sortedArray);
        const coords = sortedArray.map((item) => [
            Number(item.lng),
            Number(item.lat),
        ]);










        //************************************ */
        const body = {
            geometry: {
                type: "Polygon",
                coordinates: [coords],
            },
            sql: "SELECT SUM(area__ha) FROM results WHERE umd_tree_cover_loss__year >= 2014 and umd_tree_cover_loss__year <= 2021 group by umd_tree_cover_loss__year",
        };

        const resp = await fetch(
            // Use this endpoint from their documentaion: https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest/query
            "https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest/query/json",
            {
                method: "POST",
                body: JSON.stringify(body),
                headers: { "Content-Type": "application/json" },
            }
        );

        forestResponse = await resp.json();

        //*******************sentinel 2************ */
        const body2 = {
            geometry: {
                type: "Polygon",
                coordinates: [coords],
            },
            sql: "SELECT SUM(area__ha),umd_glad_sentinel2_alerts__date FROM results WHERE umd_glad_sentinel2_alerts__date >= '2020-01-01' and umd_glad_sentinel2_alerts__date <= '2024-01-01' group by umd_glad_sentinel2_alerts__date",
        };


        const resp2 = await fetch(
            // Use this endpoint from their documentaion: https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest/query
            "https://data-api.globalforestwatch.org/dataset/umd_glad_sentinel2_alerts/latest/query/json",
            {
                method: "POST",
                body: JSON.stringify(body2),
                headers: { "Content-Type": "application/json" },
            }
        )


        // sent2Response = await resp2.json();
        //   console.log(sent2Response);
        /************* */



    } catch (err) {
        console.log("COULD NOT GET FARM PLOT COORDINATES VIEW", err.message);
        return {
            statusCode: 404,
            message: "COULD NOT GET FARM PLOT COORDINATES VIEW: " + err.message,
        };
    }

    let textoPersonalizado;
    let textoPersonalizadoSen;
    if (forestResponse?.data?.length) {
        textoPersonalizado = "There was a risk of tree cover loss in the following years:  \n";

        forestResponse.data.forEach((el) => {
            textoPersonalizado += `Year: ${el.umd_tree_cover_loss__year} ; Ha:  ${el.area__ha}  \n`;
        });
    } else {
        textoPersonalizado = "There is either no risk or a negligible risk of deforestation";
    }

    if (textoPersonalizadoSen?.data?.length) {
        textoPersonalizadoSen = "There was an alert of tree cover loss in the following years:  \n";

        sent2Response.data.forEach((el) => {
            textoPersonalizado += `Year: ${el.umd_glad_sentinel2_alerts__date} ; Ha:  ${el.area__ha}  \n`;
        });
    } else {
        textoPersonalizado = "There is either no risk or a negligible risk of deforestation";
    }



    try {

        await api.updateRecord(farmPlotsDefaultViewId, farmPlot.data.id, {
            ["EUDR Commets"]: textoPersonalizado,
            ["Plot Center"]: plotCenter.lat + ", " + plotCenter.lng,
            ["Sen2 Alerts"]: textoPersonalizadoSen
        });
    } catch (err) {
        console.log("COULD NOT RESET CALCULATE AREA FIELD" + err.message);
        return {
            statusCode: 502,
            message: 'COULD NOT RESET "CALCULATE AREA" FIELD: ' + err.message,
        };
    }

    return {
        statusCode: 200,
        message: "Success",
    };
};


const forAll = async () => {
    let api;

    try {
        api = new TrackviaAPI(apiKey, accessToken, baseUrl, accountId);
    } catch (err) {
        console.log("ERROR CREATING TRACKVIA API");
        return {
            statusCode: 401,
            message: "ERROR CREATING TRACKVIA API: " + err.message,
        };
    }

    let farmPlotAmmount;


    try {
        farmPlotAmmount = await api.getView(farmPlotsDefaultViewId);
    } catch (err) {
        console.log("COULD NOT FETCH ammount RECORD");
        return {
            statusCode: 404,
            message: "COULD NOT FETCH ammount RECORD: " + err.message,
        };
    }


    for (let i = 1; i < farmPlotAmmount.totalCount; i++) {
        console.log(farmPlotAmmount.totalCount);
        await handler({ recordId: i })
    }

}


forAll();

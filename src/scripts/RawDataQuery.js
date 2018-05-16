'use strict';
import {json} from 'd3-fetch';
import {select} from 'd3-selection';
import {getGtexUrls,
    parseTissues,
    parseSamples
} from './modules/gtexDataParser';
import Toolbar from './modules/Toolbar';

/*
TODO:
first build a data matrix with the following structure
{
    col: tissues
    row: data types
    data: [ objects with col and row and value ]
}
 */
/**
 * build the data matrix table
 * @param tableId {String}
 * @param datasetId {String}
 * @param urls
 */

export function buildDataMatrix(tableId, datasetId='gtex-v7', urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        json(urls.sample + 'WGS'),
        json(urls.sample + 'WES')
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            let wgsTable = parseSamples(args[1]).reduce((a, d)=>{
                if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
                a[d.tissueId]= a[d.tissueId]+1;
                return a;
                }, {});
            let wesTable = parseSamples(args[2]).reduce((a, d)=>{
                if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
                a[d.tissueId]= a[d.tissueId]+1;
                return a;
                }, {});
            const columns = [
                {
                    label: 'RNA-Seq',
                    id: 'rnaSeqSampleCount'
                },
                {
                    label: 'RNA-Seq with WGS',
                    id: 'rnaSeqAndGenotypeSampleCount'
                },
                {
                    label: 'WES',
                    id: 'wes'
                },
                {
                    label: 'WGS',
                    id: 'wgs'
                }
            ];
            const rows = tissues.map((t)=>{
                t.id = t.tissueId;
                t.label = t.tissueName;
                t.wes = wesTable[t.tissueId] || undefined;
                t.wgs = wgsTable[t.tissueId] || undefined;
                return t;
            });
            // const theData = [];
            // rows.forEach((row)=>{
            //     columns.forEach((col)=>{
            //         let value = row[col.id] || undefined;
            //         theData.push({
            //             x: row.id,
            //             y: col.id,
            //             value: value
            //         })
            //     })
            // });
            const theMatrix = {
                X: rows,
                Y: columns,
                // data: theData
            };
            _renderMatrixTable(datasetId, tableId, theMatrix);
            _addClickEvents(tableId);
            _addToolbar(tableId, theMatrix);


        })
        .catch(function(err){console.error(err)});
}

/**
 * Render the matrix in an HTML table format
 * @param datasetId {String}
 * @param tableId {String} the DOM ID of the table
 * @param mat {Object} of attr: X--a list of x objects, Y--a list of y objects, and data--a list of data objects
 * @private
 */
function _renderMatrixTable(datasetId, tableId, mat){
    const dataset = {
        'gtex-v7': {
            label:'GTEX V7',
            bgcolor: '#2a718b'
        }
    };
    // rendering the column labels
    const theTable = select(`#${tableId}`);
    theTable.select('thead').selectAll('th')
        .data([{label:"", id:""}].concat(mat.Y))
        .enter()
        .append('th')
        .attr('scope', 'col')
        .attr('class', (d, i)=>`y${i}`)
        .text((d)=>d.label);

    theTable.select('.table-label')
        .append('th')
        .attr('colspan', mat.Y.length + 1)
        .text(dataset[datasetId].label)
        .style('background-color',dataset[datasetId].bgcolor);

    const theRows = theTable.select('tbody').selectAll('tr')
        .data(mat.X)
        .enter()
        .append('tr');

    // rendering the row label
    theRows.append('th')
        .attr('scope', 'row')
        .attr('class', (d, i)=>`x${i}`)
        .text((d)=>d.label);

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y1`)
        .text((d)=>d.rnaSeqSampleCount||'');

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y2`)
        .text((d)=>d.rnaSeqAndGenotypeSampleCount||'');

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y3`)
        .text((d)=>d.wes||'');

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y4`)
        .text((d)=>d.wgs||'');
}

/**
 * Add customized column, row and cell click events
 * @param tableId {String} the dom ID of the table
 * @private
 */
function _addClickEvents(tableId){
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    // column labels
    select(`#${tableId}`).select('thead').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selection
           const theColumn = select(this).attr('class');
           if (select(this).attr('scope') == 'col') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theColumn}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'col');
               theCells.filter(`.${theColumn}`).classed('selected', false);
           }
           // console.log(theColumn);
        });

    // row labels
    select(`#${tableId}`).select('tbody').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
           const theRow = select(this).attr('class');
           if (select(this).attr('scope') == 'row') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theRow}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'row');
               theCells.filter(`.${theRow}`).classed('selected', false);
           }
           // console.log(theRow);
        });


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        })
}

function _addToolbar(tableId, mat){
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');
    select('#sample-download')
        .style('cursor', 'pointer')
        .on("click", function(){
            theCells.filter(`.selected`)
                .each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))-1].id;
                    console.log("Download " + x + " : "+ y);
                })
        });
    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on("click", function(){
            alert("Send to FireCloud. To be implemented.")
        });
}



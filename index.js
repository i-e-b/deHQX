var fs = require('fs');

var keyStr = "!\"#$%&'()*+,-012345689@ABCDEFGHIJKLMNPQRSTUVXYZ[`abcdefhijklmpqr";
var rleMark = 144;

// decode the ASCII chars into an int array
function coreDecode (input) {
    var output = [];
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[\r\n \t]/g, "");

    while (i < input.length) {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output.push(chr1);
        output.push(chr2);
        output.push(chr3);
    }
    return output;
}

function flatten(input) {
    var flattened=[];
    for (var i=0; i<input.length; ++i) {
        var current = input[i];
        for (var j=0; j<current.length; ++j)
            flattened.push(current[j]);
    }
    return flattened;
}

// expand run length encoding. Mutates input.
function expandRLE(input) {
    //  The character to be repeated is followed by a 0x90 byte then the repeat count.
    //  For example, FF9004 means repeat 0xFF 4 times.
    //  The special case of a repeat count of zero means it's not a run, but a literal 0x90.  2B9000 => 2B90.
    //  Note: the 9000 can be followed by a run, which means to repeat the 0x90 (not the character previous to that).
    //  That is, 2B90009005 means a 2B9090909090.

    var scan = 0;
    var idx = -1;
    while ((idx = input.indexOf(rleMark, scan)) >= 0) {
        scan = idx+1;
        var rpt = input[idx+1];
        input[idx+1] = []; // remove repeat count from data
        if (rpt == 0 && input[idx+2] == rleMark && input[idx+3] != 0) { // check for a run of literal `0x90`
            var lrpt = input[idx+3];
            input[idx+2] = []; input[idx+3] = []; // remove repeat count
            input[idx] = Array(lrpt).fill(rleMark); // replace repeat mark with all instances
        } else if (rpt > 0) {
            input[idx] = Array(rpt-1).fill(input[idx-1]); // replace repeat mark with remaining instances
        }
    }

    return flatten(input);
}

function stringOf(intArray, start, length) {
    return String.fromCharCode.apply([], intArray.slice(start, (start+length)));
}

function bufferFrom(intArray, start, length) {
    return new Buffer(intArray.slice(start, (start+length)));
}

function getLong(arr, start) {
    return (arr[start] << 24) + (arr[start+1] << 16) + (arr[start+2] << 8) + (arr[start+3]);
}
function getWord(arr, start) {
    return (arr[start] << 8) + (arr[start+1]);
}


// interpret the decoded bytes into a structure
function structure (raw) {
    /*

    the decoded data between the first and last colon (:) looks like:

    1       n       4    4    2    4    4   2   (length)
    +-+---------+-+----+----+----+----+----+--+
    |n| name... |0|TYPE|AUTH|FLAG|DLEN|RLEN|HC| (contents)
    +-+---------+-+----+----+----+----+----+--+

            DLEN                2    (length)
    +--------------------------+--+
    |   DATA FORK              |DC| (contents)
    +--------------------------+--+

            RLEN                    2   (length)
    +------------------------------+--+
    |    RESOURCE FORK             |RC| (contents)
    +------------------------------+--+
*/
    var nlen = raw[0]; // name length
    var typeOffs = nlen + 2;
    var ctorOffs = nlen + 6;
    var dlen = getLong(raw, nlen + 12);
    var rlen = getLong(raw, nlen + 16);
    var doffs = nlen+22;
    var roffs = doffs + dlen + 2;

    var hcrc = getWord(raw, nlen + 20);
    var dcrc = getWord(raw, doffs + dlen);
    var rcrc = getWord(raw, roffs + rlen);

    var expected = 26 + nlen + dlen + rlen;
    var spareBytes = raw.length - expected;

    if (raw[nlen+1] !== 0) { throw new Error("malformed file -- no name terminator"); }

    return {
        name : stringOf(raw, 1, nlen),
        type : stringOf(raw, typeOffs, 4),
        creator : stringOf(raw, ctorOffs, 4),
        headCRC : hcrc,
        dataCRC : dcrc,
        resourceCRC : rcrc,
        data_length : dlen,
        resoure_length : rlen,
        expectedBytes:expected,
        actualBytes:raw.length,
        spareBytes : spareBytes,
        dataBuffer: bufferFrom(raw, doffs, dlen),
        rsrcBuffer: bufferFrom(raw, roffs, rlen)
    };
}

function readBinHexFile(path) {
    // this does all the transform is memory, which will limit file size.
    // should not be a problem with historic files.
    var input = fs.readFileSync(path, "ascii");
    var marker = "(This file must be converted with BinHex 4.0)";
    var startPoint = input.indexOf(marker);
    if (startPoint < 0) { throw new Error("invalid file -- no binhex marker found"); }
    startPoint = input.indexOf(':', startPoint + marker.length-1) +1;
    var endPoint = input.indexOf(':', startPoint)-1;
    return input.slice(startPoint, endPoint);
}

//console.log(JSON.stringify(expandRLE([0x05,0x90,0x05,0x90,0x00,0x90,0x05]))); // 5x5, 5x144
var binhex = readBinHexFile("./sample-data/tetrismax2.6.sit.hqx");
//console.log(binhex);

// it seems that some hqx files don't use the RLE encoding?
var result = structure(coreDecode(binhex));//structure(expandRLE(coreDecode(binhex)));
fs.writeFileSync("./sample-data/"+result.name, result.dataBuffer);
fs.writeFileSync("./sample-data/"+result.name+".rsrc", result.rsrcBuffer);

result.dataBuffer = "written to disk";
result.rsrcBuffer = "written to disk";
console.log(JSON.stringify(result));//, null, 2));



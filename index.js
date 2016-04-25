
var _keyStr = "!\"#$%&'()*+,-012345689@ABCDEFGHIJKLMNPQRSTUVXYZ[`abcdefhijklmpqr?";

function coreDecode (input) {
    var output = [];
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[\r\n \t]/g, "");

    while (i < input.length) {

        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));

        // TODO: runlength decoding

        // TODO: check byte ordering
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output.push(chr1);

        if (enc3 != 64) {
            output.push(chr2);
        }
        if (enc4 != 64) {
            output.push(chr3);
        }

    }
    return output;
}

var smalltest = "'94PG(*TFb\"0BAJJ-Lif)'C[E'4PFLjcDA3!8dP84&0*9#%!N!-0LpJ!N!5(`P0 *9#%!!3!0LpKb6'&e!Q3!N!-@!!!J)\"98CA4bDA-J6@&i)$)Z0L\"QEfaNCA)!N!T 5T3#3!eN!b3&6!Q!!N!-+!*!2KJ!!!5$rN!3&!+aB+i'X@#hZ!*!&%bZh!*!&$BY";

console.log(JSON.stringify(coreDecode(smalltest)));

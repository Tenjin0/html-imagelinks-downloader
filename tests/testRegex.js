const regimageLink = /<img.*src="(((https?:\/)?\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)".*[^<]\/?>/g;

const content =
	"<!doctype html>" +
	"<html>" +
	"  <head>" +
	"    <title>Test API -> Printer</title>" +
	"  </head>" +
	'  <body style="font-family: Arial, Sans-serif; width: 300px">' +
	'    <div style="width: 100%; text-align: center;">' +
	// '<img src="https://www.w3schools.com/w3images/wedding.jpg" alt="Afficher l\'image d\'origine" width="60" height="70" />' +
	// '<img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Afficher l\'image d\'origine" />' +
	// '<img src="https://www.w3schools.com/howto/img_forest.jpg" alt="Afficher l\'image d\'origine2" />' +
	'<img alt="Google" height="92" id="hplogo" src="/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" srcset="/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png 1x, /images/branding/googlelogo/2x/googlelogo_color_272x92dp.png 2x" style="padding-top:109px" width="272" onload="window.lol&amp;&amp;lol()" data-atf="3">' +
	"    </div>" +
	"    <br />" +
	'    <div style="border: 1px solid black; padding: 5px;">ceci est un test</div>' +
	"  </body>" +
	"</html>";

console.log(regimageLink.test(content));
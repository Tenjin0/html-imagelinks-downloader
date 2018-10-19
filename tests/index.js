const HttpsLinksConverter = require("../dist/main");

const hlc = new HttpsLinksConverter("../images");

const content =
	"<!doctype html>" +
	"<html>" +
	"  <head>" +
	"    <title>Test API -> Printer</title>" +
	"  </head>" +
	'  <body style="font-family: Arial, Sans-serif; width: 300px">' +
	'    <div style="width: 100%; text-align: center;">' +
	'<img src="https://localhost/wyndblack.png" alt="Afficher l\'image d\'origine" width="60" height="70" />' +
	'<img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Afficher l\'image d\'origine" />' +
	'<img src="https://www.w3schools.com/howto/img_forest.jpg" alt="Afficher l\'image d\'origine2" />' +
	"    </div>" +
	"    <br />" +
	'    <div style="border: 1px solid black; padding: 5px;">ceci est un test</div>' +
	"  </body>" +
	"</html>";

hlc.convert(content)
	.then(() => {
		return hlc.reset(true);
	})
	.then(() => {
		return hlc.convert(content);
	})
	.then(() => {
		return hlc.reset(true).then(() => {});
	})
	.catch(err => {
		console.log(err);
	});

// hlc._requestToBase64("https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png")

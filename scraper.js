//var fs = require('fs');

var casper = require('casper').create({
    waitTimeout: 20000,
    viewportSize: {
        width: 1920,
        height: 1500
    },
    //verbose: true,
    logLevel: 'error',
    pageSettings: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
        cookiesEnabled: true,
        javascriptEnabled: true
    }
});

casper.on('remote.message', function (msg) {
    this.echo('remote message caught: ' + msg);
});

var resources = {};
var base_url = "http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/";

// casper.saveJSON = function (resource_object) {
//     if (resource_object != null) {
//         Object.keys(resource_object).forEach(function(element) {
//             fs.write("data/" + element.replace(/::/g, '_') + ".json", JSON.stringify(resource_object, null, ''), 'w');
//         });
//     }
// };

// Login
casper.start(base_url + "aws-template-resource-type-ref.html", function () {
    resources = this.evaluate(function (base_url) {
        var resources = {};
        $("div#main-col-body").find("div.section").find("div.highlights").find("ul").find("li").each(function (index) {
            resources[$(this).find("a").text()] = {
                "url": base_url + $(this).find("a").attr("href"),
                "properties": {},
                "return_values": {}
            };
        });
        return resources;
    }, base_url);
});

casper.then(function () {
    var urls = [];

    for (var resource in resources) {
        if (resources.hasOwnProperty(resource)) {
            urls.push({"url": resources[resource]["url"], "resource": resource});
        }
    }

    this.each(urls, function (self, url_obj) {
        self.thenOpen(url_obj["url"], function () {
            resources[url_obj["resource"]]["properties"] = self.evaluate(function (url_obj) {
                var resource_properties = {};
                var resource_name = "";
                $("div.variablelist").find("dl").find("dt,dd").each(function () {
                    if (this.nodeName == "DT") {
                        resource_name = this.outerText;
                        resource_properties[resource_name] = {};
                    } else {
                        var previous_sibling = this.previousSibling;
                        resource_name = previous_sibling.outerText;
                        resource_properties[resource_name]["description"] = "";
                        $(this).children().each(function () {
                            if ($(this).find("span.emphasis").length <= 0) {
                                resource_properties[resource_name]["description"] += $(this).html().replace(/\n/g, '').replace(/\s\s+/g, ' ');
                            } else {
                                var property_name = $(this).find("span.emphasis:first").text().toLowerCase().replace(/\s/g, '_');
                                var regex_pattern = new RegExp("^<span class=\"emphasis\"><em>" + $(this).find("span.emphasis:first").text() + "<\/em><\/span>:");
                                resource_properties[resource_name][property_name] = $(this).html().replace(regex_pattern, '').replace(/\n/g, '').replace(/\s\s+/g, ' ').trim();
                            }
                        });
                    }
                });
                return resource_properties;
            }, url_obj);
        });
    });
});

casper.run(function () {
    this.echo(JSON.stringify(resources));
    this.exit();
});
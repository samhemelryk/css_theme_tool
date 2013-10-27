YUI.add('moodle-block_css_theme_tool-csseditor-colourpicker', function (Y, NAME) {

var COLOURPICKER = function(config) {
    COLOURPICKER.superclass.constructor.apply(this, arguments);
};
COLOURPICKER.prototype = {
    /**
     * The box top display in
     * @var {Y.Node}
     */
    box : null,
    dialogue : null,
    /**
     * The overlay this component uses
     * @var {Y.Overlay}
     */
    overlay : null,
    /**
     * The currently selected colour
     * @var {string}
     */
    currentcolour : null,
    /**
     * @var {bool}
     */
    overlayshown : false,
    /**
     * The CSS builder this component is associated with
     * @var {M.block_css_theme_tool.css_builder}
     */
    cssbuilder : null,
    /**
     * The style this picker is used for
     * @var {string}
     */
    cssstyle : null,
    width : 384,
    height : 128,
    factor : 4,
    /**
     * An object containing component events
     * @var {object}
     */
    events: {
        /**
         * Used to track when the mouse enters the colour picker
         * @var {Y.Event}
         */
        mouseenter : null,
        /**
         * Used to track the click event of the colour picker
         * @var {Y.Event}
         */
        click : null,
        /**
         * Used to track when the mouse moves over the colour picker
         * @var {Y.Event}
         */
        mousemove : null,
        /**
         * Used to track when the mouse leaves the colour picker
         * @var {Y.Event}
         */
        mouseleave : null
    },
    initializer : function(config) {
        this.cssbuilder = config.cssbuilder;
        this.currentcolour = '#FFFFFF';
        this.cssstyle = config.cssstyle;

        this.box = new Y.Overlay({
            headerContent : '<h2 class="header">'+M.str.block_css_theme_tool.colourpickertitle+'</h2><div class="close"></div>',
            bodyContent : '<div class="colorpickerdialogueoverlay"></div><div class="previouscolours"></div>',
            centered : true,
            visible : false,
            zIndex : 4500
        });
        this.box.render(Y.one(document.body));
        this.box.get('boundingBox').one('.close').on('click', this.hide, this);
        this.dialogue = this.box.get('boundingBox').addClass('ctt-colourpicker').one('.colorpickerdialogueoverlay');
        this.dialogue.setStyle('backgroundImage', 'url('+M.cfg.wwwroot+'/blocks/css_theme_tool/colourpicker_image.php)');
        this.dialogue.on('click', this.pick_colour, this);
        this.dialogue.on('mouseenter', this.start_follow, this);
        this.dialogue.on('mouseleave', this.stop_follow, this);

        this.overlay = new Y.Overlay({
            bodyContent : ' ',
            width: '50px',
            height : '50px',
            centered : false,
            visible : false,
            zIndex : 4600
        });
        this.overlay.render(Y.one(document.body));
        this.overlay.bodyNode.addClass('colourpicker_preview');
        config.button.on('click', this.show, this);

        var previous = Y.Cookie.get("cttpreviouscolours");
        if (previous && M.block_css_theme_tool.previouscolours.length == 0) {
            previous = previous.split(';');
            var pcs = this.box.get('boundingBox').one('.previouscolours');
            for (var i in previous) {
                var pc = Y.Node.create('<div class="previouscolour"></div>').setStyle('backgroundColor', previous[i]);
                pc.on('click', this.pick_previous_colour, this, previous[i]);
                pcs.append(pc);
            }
            M.block_css_theme_tool.previouscolours = previous;
        }
    },
    /**
     * Sets the background colour to the floating overlay to that of the colour the mouse is over.
     * @var {Y.Event}
     */
    display_color : function(e) {
        this.overlay.move(e.pageX+10, e.pageY+10);
        this.currentcolour = this.determine_colour(e);
        this.overlay.bodyNode.setStyle('backgroundColor', this.currentcolour);
    },
    /**
     * Starts the proceedings for the colour picker, following changes the overlay
     * background colour and when clicked stops and adds the style to the CSS builder.
     * @var {Y.Event}
     */
    start_follow : function(e) {
        if (this.events.mousemove) {
            this.events.mousemove.detach();
        }
        this.overlay.show();
        this.overlayshown = true;
        this.events.mousemove = this.dialogue.on('mousemove', this.display_color, this);
        this.display_color(e);
    },
    /**
     * Stops following the mouse and does away with the colour picker
     */
    stop_follow : function() {
        this.overlay.hide();
        this.overlayshown = false;
        this.events.mousemove.detach();
    },
    /**
     * Determines the colour the mouse is currently over.
     *
     * This is the a reversal of the logic in ~/colourpicker_image.php and mathematically
     * determines the colour below the mouse pointer
     * @var {Y.Event}
     * @return {string}
     */
    determine_colour : function(e) {

        if (e.target) {
            var eventx = Math.floor(e.pageX-e.target.getX());
            var eventy = Math.floor(e.pageY-e.target.getY());
        } else {
            return;
        }

        var imagewidth = this.width;
        var imageheight = this.height;
        var factor = this.factor;
        var colour = [255,0,0];

        var matrices = [
            [  0,  1,  0],
            [ -1,  0,  0],
            [  0,  0,  1],
            [  0, -1,  0],
            [  1,  0,  0],
            [  0,  0, -1]
        ];

        var matrixcount = matrices.length;
        var limit = Math.round(imagewidth/matrixcount);
        var heightbreak = Math.round(imageheight/2);

        for (var x = 0; x < imagewidth; x++) {
            var divisor = Math.floor(x / limit);
            var matrix = matrices[divisor];

            colour[0] += matrix[0]*factor;
            colour[1] += matrix[1]*factor;
            colour[2] += matrix[2]*factor;

            if (eventx==x) {
                break;
            }
        }

        var pixel = [colour[0], colour[1], colour[2]];
        if (eventy < heightbreak-1) {
            pixel[0] += Math.floor(((255-pixel[0])/heightbreak) * (heightbreak - eventy));
            pixel[1] += Math.floor(((255-pixel[1])/heightbreak) * (heightbreak - eventy));
            pixel[2] += Math.floor(((255-pixel[2])/heightbreak) * (heightbreak - eventy));
        } else if (eventy > heightbreak+1) {
            pixel[0] = Math.floor((imageheight-eventy)*(pixel[0]/heightbreak));
            pixel[1] = Math.floor((imageheight-eventy)*(pixel[1]/heightbreak));
            pixel[2] = Math.floor((imageheight-eventy)*(pixel[2]/heightbreak));
        }

        return this.convert_rgb_to_hex(pixel);
    },
    /**
     * Stops everything and adds the selected colour + style to the CSS builder
     * @var {Y.Event}
     */
    pick_colour : function(e) {
        this.stop_follow();
        this.cssbuilder.manual_add_style(this.cssstyle+': '+this.currentcolour);
        this.set_current_colour(this.currentcolour);
        this.hide();
    },
    pick_previous_colour : function(e, colour) {
        this.stop_follow();
        this.cssbuilder.manual_add_style(this.cssstyle+': '+colour);
        this.hide();
    },
    set_current_colour : function(addcolour) {
        var previous = M.block_css_theme_tool.previouscolours;
        if (addcolour) {
            previous.push(addcolour);
            var pcs = this.box.get('boundingBox').one('.previouscolours');
            var pc = Y.Node.create('<div class="previouscolour"></div>').setStyle('backgroundColor', addcolour);
            pc.on('click', this.pick_previous_colour, this, addcolour);
            pcs.append(pc);
            if (previous.length > 20) {
                while (previous.length > 20) {
                    previous.shift();
                    pcs.one('.previouscolour').remove();
                }
            }
        }
        Y.Cookie.set("cttpreviouscolours", previous.join(';'), {expires: new Date("January 12, 2025")});
    },
    /**
     * Shows the colour picker component
     * @var {Y.Event}
     */
    show : function (e) {
        this.box.show();
    },
    hide : function() {
        this.overlay.hide();
        this.overlayshown = false;
        this.box.hide();
    },
    /**
     * Converts the RGB value into a hex equivilant
     * @param {array} rgb Array(r,g,b);
     * @return {string} #ABCDEF
     */
    convert_rgb_to_hex : function(rgb) {
        var hex = '#';
        var hexchars = "0123456789ABCDEF";
        for (var i=0; i<3; i++) {
            var number = Math.abs(rgb[i]);
            if (number == 0 || isNaN(number)) {
                hex += '00';
            } else {
                hex += hexchars.charAt((number-number%16)/16)+hexchars.charAt(number%16);
            }
        }
        return hex;
    }
};

Y.extend(COLOURPICKER, Y.Base, COLOURPICKER.prototype, {
    NAME : 'moodle-block_css_theme_tool-csseditor-colourpicker',
    ATTRS : {

    }
});
Y.augment(COLOURPICKER, Y.EventTarget);

M.block_css_theme_tool.init_colour_picker = function(config) {
    return new COLOURPICKER(config);
};
M.block_css_theme_tool.previouscolours = [];

}, '@VERSION@', {"requires": ["moodle-block_css_theme_tool-csseditor", "cookie"]});

YUI.add('moodle-block_css_theme_tool-csseditor-dialogueroundedcorners', function (Y, NAME) {

var ROUNDEDCORNERS = function(config) {
    ROUNDEDCORNERS.superclass.constructor.apply(this, arguments);
};
ROUNDEDCORNERS.prototype = {
    cssbuilder : null,
    nodes : {
        setbutton : null,
        cancelbutton : null,
        topleft : null,
        topright : null,
        bottomleft: null,
        bottomright : null
    },
    overlay : null,
    overlayshown : false,
    initializer : function(config) {
        this.cssbuilder = config.cssbuilder;

        // Create the 4 inputs required to collect the value for the four corners
        this.nodes.topleft = Y.Node.create('<input type="text" size="5" value="10px" name="rc_topleft" />');
        this.nodes.topright = Y.Node.create('<input type="text" size="5" value="10px" name="rc_topright" />');
        this.nodes.bottomleft = Y.Node.create('<input type="text" size="5" value="10px" name="rc_bottomleft" />');
        this.nodes.bottomright = Y.Node.create('<input type="text" size="5" value="10px" name="rc_bottomright" />');

        // Create the set and cancel buttons
        this.nodes.setbutton = Y.Node.create('<input type="submit" value="'+M.str.block_css_theme_tool.set+'" />');
        this.nodes.cancelbutton = Y.Node.create('<input type="submit" value="'+M.str.block_css_theme_tool.cancel+'" />');

        // Create a node that contains the four inputs
        var inputs = Y.Node.create('<div class="inputs"></div>');
        inputs.append(Y.Node.create('<div></div>').append('<label for="rc_topleft">'+M.str.block_css_theme_tool.postopleft+'</label>').append(this.nodes.topleft));
        inputs.append(Y.Node.create('<div></div>').append('<label for="rc_topright">'+M.str.block_css_theme_tool.postopright+'</label>').append(this.nodes.topright));
        inputs.append(Y.Node.create('<div></div>').append('<label for="rc_bottomleft">'+M.str.block_css_theme_tool.posbottomleft+'</label>').append(this.nodes.bottomleft));
        inputs.append(Y.Node.create('<div></div>').append('<label for="rc_bottomright">'+M.str.block_css_theme_tool.posbottomright+'</label>').append(this.nodes.bottomright));

        // Create a node that contains the two buttons
        var buttons = Y.Node.create('<div class="buttons"></div>');
        buttons.append(this.nodes.setbutton);
        buttons.append(this.nodes.cancelbutton);

        // Create the overlay this component will use
        this.overlay = new Y.Overlay({
            bodyContent : Y.Node.create('<div></div>').append(inputs).append(buttons),
            headerContent : '<h2 class="header">'+M.str.block_css_theme_tool.roundedcorners+'</h2>',
            width: '300px',
            centered : true,
            visible : false,
            zIndex : 5001
        });
        this.overlay.render(Y.one(document.body));
        this.overlay._stdModNode.ancestor().addClass('rounded_corner_component');

        // Attach the set and cancel events
        this.nodes.cancelbutton.on('click', this.hide, this);
        this.nodes.setbutton.on('click', this.set_value_from_form, this);

        // Attach the show event
        config.button.on('click', this.show, this);
    },
    /**
     * Show the component overlay
     */
    show : function(e) {
        this.overlay.show();
        this.overlayshown = true;
    },
    /**
     * Process the form and set the rounded corner attributes
     */
    set_value_from_form : function() {
        var tl = this.nodes.topleft.get('value') || false;
        var tr = this.nodes.topright.get('value') || false;
        var bl = this.nodes.bottomleft.get('value') || false;
        var br = this.nodes.bottomright.get('value') || false;

        if (tl && tr && bl && br && tl == tr  && tr == bl && bl == br) {
            this.cssbuilder.manual_add_style('border-radius: '+tl);
            this.cssbuilder.manual_add_style('-moz-border-radius: '+tl);
            this.cssbuilder.manual_add_style('-webkit-border-radius: '+tl);
        } else {
            if (tl) {
                this.cssbuilder.manual_add_style('border-top-left-radius: '+tl);
                this.cssbuilder.manual_add_style('-moz-border-radius-topleft: '+tl);
                this.cssbuilder.manual_add_style('-webkit-border-top-left-radius: '+tl);
            }
            if (tr) {
                this.cssbuilder.manual_add_style('border-top-right-radius: '+tr);
                this.cssbuilder.manual_add_style('-moz-border-radius-topright: '+tr);
                this.cssbuilder.manual_add_style('-webkit-border-top-right-radius: '+tr);
            }
            if (bl) {
                this.cssbuilder.manual_add_style('border-bottom-left-radius: '+bl);
                this.cssbuilder.manual_add_style('-moz-border-radius-bottomleft: '+bl);
                this.cssbuilder.manual_add_style('-webkit-border-bottom-left-radius: '+bl);
            }
            if (br) {
                this.cssbuilder.manual_add_style('border-bottom-right-radius: '+br);
                this.cssbuilder.manual_add_style('-moz-border-radius-bottomright: '+br);
                this.cssbuilder.manual_add_style('-webkit-border-bottom-right-radius: '+br);
            }
        }
        this.hide();
    },
    /**
     * Hide the component overlay
     */
    hide : function() {
        this.overlay.hide();
        this.overlayshown = false;
    }
};

Y.extend(ROUNDEDCORNERS, Y.Base, ROUNDEDCORNERS.prototype, {
    NAME : 'moodle-block_css_theme_tool-csseditor-dialogueroundedcorners',
    ATTRS : {

    }
});
Y.augment(ROUNDEDCORNERS, Y.EventTarget);

M.block_css_theme_tool.init_rounded_corners = function(config) {
    return new ROUNDEDCORNERS(config);
};

}, '@VERSION@', {"requires": ["moodle-block_css_theme_tool-csseditor", "overlay"]});

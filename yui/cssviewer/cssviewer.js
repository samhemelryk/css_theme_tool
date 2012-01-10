YUI.add('moodle-block_css_theme_tool-cssviewer', function(Y) {

var CSSVIEWER = function(config) {
    CSSVIEWER.superclass.constructor.apply(this, arguments);
}
CSSVIEWER.prototype = {
    /**
     * The themetool instance this component belongs to.
     * @var {css_theme_tool}
     */
    themetool : null,
    /**
     * True if the component is being shown
     * @var {bool}
     */
    shown : false,
    /**
     * The event for closing the overlay
     * @var {Y.Event}
     */
    eventcloseoverlay : null,
    /**
     *
     */
    initializer : function(config) {
        this.themetool = config.cssthemetool;
        // Attach the event to display the CSS
        Y.one('.block_css_theme_tool input.viewcssbutton').removeAttribute('disabled').on('click', this.show, this);
    },
    /**
     * Shows the CSS viewer component
     */
    show : function () {
        // First hide all other components (they may be using the dialogue)
        this.themetool.hide_components();
        // Create the content div for the CSS viewer
        var content = Y.Node.create('<div class="viewcssbox"></div>');
        for (var i in this.themetool.rules) {
            // Create the HTML for each rule so we can show it
            var r = this.themetool.rules[i];
            var selector = Y.Node.create('<div class="cssrule"></div>');
            var editicon = Y.Node.create('<img src="'+M.util.image_url('t/edit', 'moodle')+'" alt="edit" style="width:11px;height:11px;" class="icon" />');
            var deleteicon = Y.Node.create('<img src="'+M.util.image_url('t/delete', 'moodle')+'" alt="delete" style="width:11px;height:11px;" class="icon" />');
            selector.append(editicon);
            selector.append(deleteicon);
            selector.append(Y.Node.create('<span class="selector">'+r.selector+'</span> {'+r.styles.join('')+'}'));
            // Add it to the content div
            content.append(selector);
            // Attach the edit event
            editicon.on('click', this.edit_rule, this, r);
            // Attach the delete event
            deleteicon.on('click', this.delete_rule, this, r);
        }
        // Setup the theme tools overlays as we require
        this.themetool.overlay.set('bodyContent', content);
        this.themetool.overlay.show();
        // Attach the close event to a click anywhere on the overlay
        this.eventcloseoverlay = this.themetool.overlay.bodyNode.on('click', this.hide, this);
        this.shown = true;
    },
    /**
     * Hides the CSS viewer component if it is being shown
     */
    hide : function () {
        if (this.shown) {
            this.eventcloseoverlay.detach();
            this.themetool.overlay.hide();
            this.shown = false;
        }
    },
    /**
     * Sets up to edit the selected rule
     *
     * @param {Y.Event} e
     * @param {object} rule
     */
    edit_rule : function(e, rule) {
        this.themetool.edit_rule(rule.selector);
    },
    /**
     * Sets up to delete the selected rule
     *
     * @param {Y.Event} e
     * @param {object} rule
     */
    delete_rule : function(e, rule) {
        this.themetool.delete_rule(rule.selector);
    }
};

Y.extend(CSSVIEWER, Y.Base, CSSVIEWER.prototype, {
    NAME : 'css_viewer',
    ATTRS : {
        
    }
});
Y.augment(CSSVIEWER, Y.EventTarget);

M.block_css_theme_tool.init_css_viewer = function(config) {
    return new CSSVIEWER(config);
}

}, '@VERSION@', {requires:['moodle-block_css_theme_tool-base']});
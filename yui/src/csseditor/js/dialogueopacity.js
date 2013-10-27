YUI.add('moodle-block_css_theme_tool-dialogueopacity', function(Y) {

var OPACITY = function(config) {
    OPACITY.superclass.constructor.apply(this, arguments);
}
OPACITY.prototype = {
    cssbuilder : null,
    initializer : function(config) {
        this.cssbuilder = config.cssbuilder;
        config.button.on('click', this.show, this);
    },
    show : function(e) {
        var opacity = prompt(M.str.block_css_theme_tool.opacityprompt);
        opacity = opacity.replace(/^0?\./, '');
        opacity = opacity.replace(/\%$/, '');
        if (opacity.match(/^(\d{1,2}|100)$/)) {
            this.cssbuilder.manual_add_style('-moz-opacity: .'+opacity);
            this.cssbuilder.manual_add_style('filter: alpha(opacity='+opacity+')');
            this.cssbuilder.manual_add_style('opacity: .'+opacity);
        }
    }
};

Y.extend(OPACITY, Y.Base, OPACITY.prototype, {
    NAME : 'opacity',
    ATTRS : {

    }
});
Y.augment(OPACITY, Y.EventTarget);

M.block_css_theme_tool.init_dialogue_opacity = function(config) {
    return new OPACITY(config);
}

}, '@VERSION@', {requires:['moodle-block_css_theme_tool-base']});
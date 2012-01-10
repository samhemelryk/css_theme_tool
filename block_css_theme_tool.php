<?php

/**
 * Contains the core class for the CSS theme tool
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once($CFG->dirroot.'/blocks/css_theme_tool/lib.php');

/**
 * Description of block_css_theme_tool
 *
 * @package block_css_theme_tool
 * @copyright 2010 Sam Hemelryk <sam.hemelryk@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_css_theme_tool extends block_base {

    protected $visualversion = '0.3.0';

    function init() {
        $this->title = get_string('pluginname', 'block_css_theme_tool');
    }

    function applicable_formats() {
        return array('all' => true);
    }

    function instance_allow_multiple() {
        return false;
    }

    function get_content() {
        global $USER;

        if ($this->content !== NULL) {
            return $this->content;
        }

        $this->content = new stdClass;
        $this->content->footer = '';
        $this->content->text = '';

        $csssupported = false;
        if ($this->page->state == moodle_page::STATE_BEFORE_HEADER) {
            $csssupported = true;
            $this->page->requires->css(css_theme_tool::get_cached_file_url($this->context));
        } else {
            //$this->page->requires->js_init_call('M.block_css_theme_tool.init_css_by_js', array(css_theme_tool::get_cached_file_url($this->context)));
        }

        if (has_capability('block/css_theme_tool:modifystyles', $this->context)) {   // Show the block

            $savebuttonclasses = array('savechangesbutton');
            if (get_user_preferences('css_theme_tool_auto_save_changes', false)) {
                $savebuttonclasses[] = 'autosaveenabled';
            }

            $this->content->footer = get_string('version', 'block_css_theme_tool', $this->visualversion);
            $this->content->text .= html_writer::start_tag('div', array('class'=>'options'));
            $this->content->text .= html_writer::empty_tag('input', array('type'=>'button', 'value'=>get_string('addrule', 'block_css_theme_tool'), 'class'=>'addrulebutton', 'disabled'=>'disabled'));
            $this->content->text .= html_writer::empty_tag('input', array('type'=>'button', 'value'=>get_string('viewcss', 'block_css_theme_tool'), 'class'=>'viewcssbutton', 'disabled'=>'disabled'));
            $this->content->text .= html_writer::empty_tag('input', array('type'=>'button', 'value'=>get_string('savechanges', 'block_css_theme_tool'), 'class'=>join(' ', $savebuttonclasses), 'disabled'=>'disabled'));
            $this->content->text .= html_writer::empty_tag('input', array('type'=>'button', 'value'=>get_string('settings'), 'class'=>'settingsbutton', 'disabled'=>'disabled'));
            $this->content->text .= html_writer::end_tag('div');

            if (!$csssupported) {
                $this->content->text .= html_writer::tag('div', get_string('cssnotsupported','block_css_theme_tool'), array('class'=>'cssnotsupported'));
            }

            $this->initialise_javascript();

            user_preference_allow_ajax_update('css_theme_tool_full_body_tags',      PARAM_BOOL);
            user_preference_allow_ajax_update('css_theme_tool_auto_save_changes',   PARAM_BOOL);
            user_preference_allow_ajax_update('css_theme_tool_only_view_my_rules',  PARAM_BOOL);
        }

        return $this->content;
    }

    public function initialise_javascript() {
        global $USER;

        $currentuseronly = get_user_preferences('css_theme_tool_only_view_my_rules', false);
        $modules = array(
            'moodle-block_css_theme_tool-base'
        );
        $function = 'M.block_css_theme_tool.init';
        $arguments = array(
            'instanceid' => $this->instance->id,
            'css' => css_theme_tool::get_rules_for_json($currentuseronly),
            'settings' => array(
                'userid' => $USER->id,
                'fullbodytags' => (get_user_preferences('css_theme_tool_full_body_tags', false)),
                'autosaveonchange' => (get_user_preferences('css_theme_tool_auto_save_changes', false)),
                'onlyviewmyrules' => $currentuseronly
            )
        );
        $this->page->requires->yui_module($modules, $function, array($arguments));
        $this->page->requires->strings_for_js(array(
                'savenotification',
                'cannotfindnode',
                'errorcapturingclick',
                'highlight',
                'save',
                'cancel',
                'addnewstyle',
                'purgerules',
                'purgerulesdesc',
                'purgerulesconfirm',
                'purgerulescomplete',
                'close',
                'exportcss',
                'exportcssdesc',
                'exporttheme',
                'exportthemedesc',
                'showadvancedbodytags',
                'showadvancedbodytagsdesc',
                'opacityprompt',
                'roundedcorners',
                'postopleft',
                'postopright',
                'posbottomleft',
                'posbottomright',
                'set',
                'fontcolour',
                'backgroundcolour',
                'bold',
                'italic',
                'underline',
                'alignleft',
                'aligncenter',
                'alignright',
                'roundedcorners',
                'opacity',
                'autosaveonchange',
                'autosaveonchangedesc',
                'onlyviewmyrules',
                'onlyviewmyrulesdesc',
                'preview',
                'viewthepage',
                'colourpickertitle'
            ), 'block_css_theme_tool');
    }

    public function send_file($context, $filearea, $itemid, $filepath, $filename) {
        $fs = get_file_storage();
        $file = $fs->get_file($context->id, $filearea, $itemid, $filepath, $filename);
        if ($file) {
            session_get_instance()->write_close(); // unlock session during fileserving
            send_stored_file($file, 0, 0, true); // must force download - security!
        } else {
            send_file_not_found();
        }
    }
}

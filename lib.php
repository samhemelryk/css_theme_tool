<?php

/**
 * Contains all of the classes used by the CSS theme tool
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Main CSS theme tool class
 *
 * This class is made up mostly of static methods that instantiae itself and do
 * all of the work. This saves on writing code for those who wish to use it.
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class css_theme_tool {

    /**
     * An array of rules that are stored in the database
     * 
     * @var array
     */
    protected $rules = null;

    /**
     * Gets all of the rules associated with the CSS theme tool
     * 
     * @global moodle_database $DB
     * @return array
     */
    public function get_rules() {
        global $DB;
        if ($this->rules === null) {
            $this->rules = array();
            $rules = $DB->get_records('block_css_theme_tool');
            if (count($rules)) {
                $styles = $DB->get_records('block_css_theme_tool_styles');
                foreach ($rules as $key=>$rule) {
                    $this->rules[$key] = new css_theme_tool_rule();
                    $this->rules[$key]->load($rule->id, $rule, $styles);
                }
            }
        }
        return $this->rules;
    }

    /**
     * Gets all of the rules for this css theme tool and returns them in an array suitable for return as JSON.
     *
     * @return array
     */
    public static function get_rules_for_json($currentuseronly=false) {
        global $USER;
        $tool = new self();
        $rules = $tool->get_rules();
        foreach ($rules as $key => &$rule) {
            if ($currentuseronly && $rule->userid != $USER->id) {
                unset($rules[$key]);
                continue;
            }
            foreach ($rule->styles as &$style) {
                $style->rule = null;
            }
        }
        return $rules;
    }

    /**
     * Output the rules as a CSS file
     */
    public static function output_css() {
        header('Content-Type: text/css');
        $tool = new self();
        $rules = $tool->get_rules();
        foreach ($rules as $rule) {
            echo $rule->selector.' {';
            foreach ($rule->styles as $style) {
                echo $style->name.':'.$style->value.';';
            }
            echo "}\n";
        }
        die();
    }

    public function get_cached_css($blockcontext) {
        $fs = get_file_storage();
        $file = $fs->get_file($blockcontext->id, 'block_css_theme_tool', 'cached_css', 0, '/', 'css_theme_tool_export.css');
        if (!$file) {
            $file = self::cache_css($blockcontext);
        }
        return $file;
    }

    public static function get_cached_file_url($context) {
        global $CFG;
        $tool = new css_theme_tool();
        $tool->get_rules();
        $file = $tool->get_cached_css($context);
        return $CFG->wwwroot.'/pluginfile.php/'.$file->get_contextid().'/'.$file->get_component().'/'.$file->get_filearea().'/'.$file->get_itemid().'/'.$file->get_filepath().'/'.$file->get_filename();
    }

    /**
     * Caches the CSS and returns the file so it can be used.
     *
     * @return stored_file
     */
    public static function cache_css($blockcontext) {
        $tool = new self();
        $rules = $tool->get_rules();
        $css = "/** Created by the CSS theme tool block **/\n";
        foreach ($rules as $rule) {
            $css .= $rule->selector.' {';
            foreach ($rule->styles as $style) {
                $css .= $style->name.':'.$style->value.';';
            }
            $css .= "}\n";
        }

        $cssfile = array(
            'contextid' => $blockcontext->id,
            'component' => 'block_css_theme_tool',
            'filearea' => 'cached_css',
            'itemid' => 0,
            'filepath' => '/',
            'filename' => 'css_theme_tool_export.css',
            'timecreated' => time(),
            'timemodified' => time()
        );
        $fs = get_file_storage();
        if ($file = $fs->get_file($cssfile['contextid'], $cssfile['component'], $cssfile['filearea'], $cssfile['itemid'], $cssfile['filepath'], $cssfile['filename'])) {
            $file->delete();
        }
        return $fs->create_file_from_string($cssfile, $css);
    }

    /**
     * Updates the rules stored in the database with those you have created
     *
     * @global moodle_database $DB
     * @param css_theme_tool_rule[] $rules
     */
    public function update_rules($rules) {
        global $DB;
        
        $oldrules = $this->get_rules();
        $rulestodelete = array();

        foreach ($oldrules as $oldrule) {
            foreach ($rules as $rule) {
                if ($rule->selector == $oldrule->selector) {
                    $rule->id = $oldrule->id;
                    continue 2;
                }
            }
            $rulestodelete[] = $oldrule->id;
        }

        if (count($rulestodelete) > 0) {
            $DB->delete_records_list('block_css_theme_tool', 'id', $rulestodelete);
            $DB->delete_records_list('block_css_theme_tool_styles', 'ruleid', $rulestodelete);
        }

        if (count($rules) > 0) {
            foreach ($rules as $rule) {
                $rule->save();
            }
        }
        $this->rules = $rules;
    }

    /**
     * Updates the rules you have created via JavaScript
     *
     * @param array $ajaxrules
     * @param array $ajaxstyles
     */
    public static function update_via_ajax($ajaxrules, $ajaxstyles) {
        $rules = array();
        foreach ($ajaxrules as $key => $selector) {
            $rule = new css_theme_tool_rule();
            $rule->create($selector, explode('@@@', $ajaxstyles[$key]));
            $rules[] = $rule;
        }
        $tool = new self();
        $tool->update_rules($rules);
    }

    /**
     * Deletes all rules that have been stored in the database
     * @global moodle_database $DB
     */
    public static function purge_rules() {
        global $DB;
        $DB->delete_records('block_css_theme_tool');
        $DB->delete_records('block_css_theme_tool_styles');
    }
}

/**
 * Class representing a CSS rule
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class css_theme_tool_rule {

    /**
     * The ID of the rule in the database (null if not stored yet)
     * @var int
     */
    public $id = null;

    /**
     * The selector as a string
     * @var string
     */
    public $selector;

    /**
     * The time this rule was last modified
     * @var int
     */
    public $timemodified;

    /**
     * The ID of the user who created this rule
     * @var int
     */
    public $userid;

    /**
     * All of the styles associated with this object {@see css_theme_tool_style}
     * @var array
     */
    public $styles = array();

    /**
     * Loads the rule from the database
     * 
     * @global moodle_database $DB
     * @param int $id
     * @param stdClass $rule
     * @param array $styles
     * @return bool
     */
    public function load($id, stdClass $rule = null, array $styles = null) {
        global $DB;
        if ($rule == null) {
            $rule = $DB->get_record('block_css_theme_tool', array('id'=>$id), '*', MUST_EXIST);
        }
        $this->id = $id;
        $this->selector = $rule->selector;
        $this->timemodified = $rule->timemodified;
        $this->userid = $rule->userid;
        $this->styles = css_theme_tool_style::load_for_rule($this, $styles);
        return true;
    }

    /**
     * Creates this object from the given selector and rules
     * @param string $selector
     * @param array $styles
     */
    public function create($selector, array $styles) {
        global $USER;
        $this->id = null;
        $this->selector = $selector;
        $this->timemodified = time();
        $this->userid = $USER->id;
        $this->styles = css_theme_tool_style::create_for_rule($this, $styles);
    }

    /**
     * Inserts or Updates the rule in the database
     * @global moodle_database $DB
     */
    public function save() {
        global $DB;
        if ($this->id !== null) {
            $DB->update_record('block_css_theme_tool', $this);
        } else {
            // Creating a new DB record
            $this->id = $DB->insert_record('block_css_theme_tool', $this);
        }

        $DB->delete_records('block_css_theme_tool_styles', array('ruleid' => $this->id));
        foreach ($this->styles as $style) {
            $style->ruleid = $this->id;
            $style->save();
        }
    }
}

/**
 * Class representing a style attribute
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class css_theme_tool_style {
    /**
     * The ID in the database (null if not saved)
     * @var int
     */
    public $id;

    /**
     * The ID of the rule this style belongs too
     * @var int
     */
    public $ruleid;

    /**
     * The rule this style belongs too
     * @var css_theme_tool_rule
     */
    public $rule;

    /**
     * The name of this style
     * @var string
     */
    public $name;

    /**
     * The value for this style
     * @var string
     */
    public $value;

    /**
     * Loads all of the styles for the given rule
     *
     * @global moodle_database $DB
     * @param css_theme_tool_rule $rule
     * @param array $dbstyles
     * @return array
     */
    public static function load_for_rule(css_theme_tool_rule $rule, array $dbstyles = null) {
        global $DB;
        $styles = Array();
        if ($dbstyles == null) {
            $dbstyles = $DB->get_records('block_css_theme_tool_styles', array('ruleid'=>$rule->id));
        }
        foreach ($dbstyles as $dbstyle) {
            if ($dbstyle->ruleid !== $rule->id) {
                continue;
            }
            $style = new self();
            $style->id = $dbstyle->id;
            $style->ruleid = $rule->id;
            $style->rule = $rule;
            $style->name = $dbstyle->name;
            $style->value = $dbstyle->value;
            $styles[] = $style;
        }
        return $styles;
    }
    /**
     * Creates new styles for the given rule
     *
     * @param css_theme_tool_rule $rule
     * @param array $newstyles
     * @return array
     */
    public static function create_for_rule(css_theme_tool_rule $rule, array $newstyles) {
        $styles = Array();
        foreach ($newstyles as $newstyle) {
            if (preg_match('/^([^:]+)\s*:\s*([^;]+);?$/', $newstyle, $bits)) {
                $style = new self();
                $style->id = null;
                $style->ruleid = $rule->id;
                $style->rule = $rule;
                $style->name = $bits[1];
                $style->value = $bits[2];
                $styles[] = $style;
            }
        }
        return $styles;
    }
    /**
     * Saves this style to the database
     *
     * @global moodle_database $DB
     */
    public function save() {
        global $DB;
        // Creating a new DB record
        $this->id = $DB->insert_record('block_css_theme_tool_styles', $this);
    }
}

/**
 * Delivers the cached CSS for this block
 *
 * @param mixed $course Not needed
 * @param stdClass $birecord
 * @param stdClass $context
 * @param string $filearea
 * @param array $args
 * @param bool $forcedownload
 */
function block_css_theme_tool_pluginfile($course, $birecord, $context, $filearea, $args, $forcedownload) {
    if ($context->contextlevel != CONTEXT_BLOCK) {
        send_file_not_found();
    }

    if ($filearea !== 'cached_css') {
        send_file_not_found();
    }

    $fs = get_file_storage();
    $filename = array_pop($args);
    $itemid = array_pop($args);
    $filepath = $args ? '/'.implode('/', $args).'/' : '/';
    
    if (!$file = $fs->get_file($context->id, 'block_css_theme_tool', 'cached_css', $itemid, $filepath, $filename)) {
        send_file_not_found();
    }

    $session = new \core\session\manager();
    $session->write_close(); // unlock session during file serving.
    send_stored_file($file, 60*60, 0, $forcedownload);
}
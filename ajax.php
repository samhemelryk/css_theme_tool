<?php

/**
 * This file processes all of the AJAX actions for the CSS theme tool block
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once('../../config.php');
require_once($CFG->dirroot.'/blocks/css_theme_tool/lib.php');

// Action determines what we do
$action = required_param('action', PARAM_ALPHA);

// Must have the sesskey
require_sesskey();

// Must be logged in and be a site admin
if (!isloggedin() || !is_siteadmin()) {
    error('You must be logged in as a site admin.');
}

switch ($action) {
    case 'save':
        // Save the rules that have been created
        $rules = required_param_array('rules', PARAM_NOTAGS);
        $styles = required_param_array('styles', PARAM_NOTAGS);
        css_theme_tool::update_via_ajax($rules, $styles);
        break;

    case 'purge':
        // Purge the rules in the database
        css_theme_tool::purge_rules();
        break;

    case 'exportcss':
        // Export the CSS
        $blockid = required_param('id', PARAM_INT);
        $blockinstance = $DB->get_record('block_instances', array('id'=>$blockid), '*', MUST_EXIST);
        $blockcontext = context_block::instance($blockinstance->id);
        css_theme_tool::cache_css($blockcontext);
        $filepath = css_theme_tool::get_cached_file_url($blockcontext);
        echo $filepath;
        break;
}
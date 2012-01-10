<?php

/**
 * The file defines the capabilities used for this block
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$capabilities = array(
    /**
     * Required in order to add or delete personal styles
     */
    'block/css_theme_tool:modifystyles' => array(
        'captype' => 'write',
        'riskbitmask' => RISK_XSS,
        'contextlevel' => CONTEXT_BLOCK,
        'archetypes' => array(
            'guest' => CAP_PROHIBIT,
            'manager' => CAP_ALLOW
        )
    )
);
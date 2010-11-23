<?php

/**
 * The file defines the capabilities used for this block
 *
 * @package   blocks
 * @subpackage css_theme_tool
 * @copyright 2010 Sam Hemelryk <sam.hemelryk@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
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
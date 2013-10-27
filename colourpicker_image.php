<?php

/**
 * Generates the colour picker image in for use with the colour picker
 * component in module.js
 *
 * This is the coolest file in this block, it mathematically generates a PNG image
 * in such a way that given XY coordinates JavaScript can work out what colour was
 * clicked.
 *
 * @package block_css_theme_tool
 * @copyright 2012 Sam Hemelryk
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Generates and sends the colour picker image
 */
function produce_colorpicker() {

    $width = 384;
    $height = 128;
    $factor = 4;
    $colour = array(255, 0, 0);

    $matrices = array();//R,  G,  B
    $matrices[] = array(  0,  1,  0);
    $matrices[] = array( -1,  0,  0);
    $matrices[] = array(  0,  0,  1);
    $matrices[] = array(  0, -1,  0);
    $matrices[] = array(  1,  0,  0);
    $matrices[] = array(  0,  0, -1);
    
    $matrixcount = count($matrices);
    $limit = ceil($width/$matrixcount);
    $heightbreak = floor($height/2);

    header("Content-type: image/png");
    $image = imagecreatetruecolor($width, $height);
    imagecolorallocate($image, 0, 0, 0);

    for ($x = 0; $x < $width; $x++) {

        $divisor = floor($x / $limit);
        $matrix = $matrices[$divisor];

        
        $colour[0] += $matrix[0]*$factor;
        $colour[1] += $matrix[1]*$factor;
        $colour[2] += $matrix[2]*$factor;

        for ($y=0;$y<$height;$y++) {
            $pixel = $colour;

            if ($y < $heightbreak) {
                $pixel[0] += ((255-$pixel[0])/$heightbreak)*($heightbreak-$y);
                $pixel[1] += ((255-$pixel[1])/$heightbreak)*($heightbreak-$y);
                $pixel[2] += ((255-$pixel[2])/$heightbreak)*($heightbreak-$y);
            } else if ($y > $heightbreak) {
                $pixel[0] = ($height-$y)*($pixel[0]/$heightbreak);
                $pixel[1] = ($height-$y)*($pixel[1]/$heightbreak);
                $pixel[2] = ($height-$y)*($pixel[2]/$heightbreak);
            }

            if ($pixel[0] < 0) $pixel[0] = 0;
            else if ($pixel[0] > 255) $pixel[0] = 255;
            if ($pixel[1] < 0) $pixel[1] = 0;
            else if ($pixel[1] > 255) $pixel[1] = 255;
            if ($pixel[2] < 0) $pixel[2] = 0;
            else if ($pixel[2] > 255) $pixel[2] = 255;

            imagesetpixel($image, $x, $y, imagecolorallocate($image, $pixel[0], $pixel[1], $pixel[2]));
        }

    }

    imagepng($image);
    imagedestroy($image);
}

produce_colorpicker();
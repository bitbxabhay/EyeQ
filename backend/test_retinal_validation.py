import io
import unittest

import numpy as np
from PIL import Image, ImageDraw

from app import validate_retinal_image


class RetinalValidationTests(unittest.TestCase):
    def test_accepts_tall_fundus_like_image(self):
        image = Image.new('RGB', (800, 1100), color=(25, 25, 25))
        draw = ImageDraw.Draw(image)
        draw.ellipse((90, 120, 710, 980), fill=(155, 55, 45))
        draw.ellipse((260, 300, 540, 760), fill=(205, 95, 70))
        image = Image.fromarray(np.asarray(image).astype(np.uint8))
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')

        validated = validate_retinal_image(buffer.getvalue(), 'tall-fundus.png')

        self.assertEqual(validated.size, (800, 1100))

    def test_rejects_tiny_non_retinal_image(self):
        image = Image.new('RGB', (200, 200), color=(255, 255, 255))
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')

        with self.assertRaises(Exception):
            validate_retinal_image(buffer.getvalue(), 'tiny.png')


if __name__ == '__main__':
    unittest.main()

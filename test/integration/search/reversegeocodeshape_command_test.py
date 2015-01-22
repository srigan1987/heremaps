__author__ = 'pieter.van.isacker'

import unittest
from .util import *

class ReverseGeocodeShapeCommandTest(unittest.TestCase):
    def setUp(self):
        self.splunkservice = create_connection()

    def test_reverse_geocode_shape_command_default(self):
        search = "search * | head 1 | eval lat=51 | eval lng=3 | reversegeocodeshape | fields lat,lng,key"
        result = return_first_result(self.splunkservice, search)
        self.assertIsNotNone(result)
        self.assertEqual(result["lat"], "51")
        self.assertEqual(result["lng"], "3")
        self.assertEqual(result["key"], "BE")

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import places

places_key = os.environ.pop('GOOGLE_PLACES_API_KEY', None)
maps_key = os.environ.pop('GOOGLE_MAPS_API_KEY', None)
try:
	try:
		places.api_key()
	except places.PlacesNotConfigured:
		pass
	else:
		raise AssertionError('Expected a missing key to raise PlacesNotConfigured.')

	os.environ['GOOGLE_MAPS_API_KEY'] = 'legacy-test-key'
	assert places.api_key() == 'legacy-test-key'
finally:
	if places_key is not None:
		os.environ['GOOGLE_PLACES_API_KEY'] = places_key
	if maps_key is not None:
		os.environ['GOOGLE_MAPS_API_KEY'] = maps_key
print('places config ok')

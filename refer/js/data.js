/**
 * data.js - the unified frame model + the nine bundled demo frames.
 *
 * REFACTOR NOTE
 * -----------------------------------------------------------------------
 * The Nuxt app carries TWO shapes: `fixtures/frames.ts` (series/alt/addedAt)
 * and `services/storage/types.ts` (anime/note/capturedAt), mapped into each
 * other inside localAdapter and losing `character` on the way. This reference
 * keeps ONE vocabulary - the storage contract's - plus two honest additions:
 *   - `character`: the fixture data the current app silently drops;
 *   - `durable`:   whether `src` will survive a reload (false = blob: URL).
 * Fixture `alt` stays as `alt` (alt text) instead of being poured into `note`.
 */
(function (global) {
  'use strict';

  var AA = global.AA || (global.AA = {});

  /** Intrinsic size shared by the bundled stills (16:9). */
  var FRAME_WIDTH = 1600;
  var FRAME_HEIGHT = 900;

  /** Build a fixture frame in the unified vocabulary. */
  function fixture(id, title, anime, episode, character, timestamp, alt, tags) {
    return {
      id: id,
      title: title,
      anime: anime,
      episode: episode,
      character: character,
      timestamp: timestamp,
      alt: alt,
      tags: tags,
      note: '',
      favorite: false,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      src: 'assets/frames/' + id + '.png',
      capturedAt: '',
      createdAt: '',
      source: 'fixture',
      durable: true,
    };
  }

  /** The nine bundled demo frames - identical copy to fixtures/frames.ts. */
  var FIXTURES = [
    fixture('frame_001', 'Rain on the crossing', 'Kagerou Line', 'EP 04', 'Aoi',
      '00:12:41', 'Frame of Aoi standing at a rain-soaked level crossing at dusk',
      ['rain', 'city', 'dusk', 'wide']),
    fixture('frame_002', 'Convenience store glow', 'Kagerou Line', 'EP 04', 'Ren',
      '00:15:03', 'Frame of Ren inside a lit convenience store aisle at night',
      ['interior', 'night', 'neon', 'close']),
    fixture('frame_003', 'Rooftop before the bell', 'Kagerou Line', 'EP 07', 'Aoi',
      '00:06:22', 'Frame of Aoi alone on a school rooftop under a pale morning sky',
      ['rooftop', 'morning', 'sky', 'wide']),
    fixture('frame_004', 'Train window, moving light', 'Kagerou Line', 'EP 07', 'Ren',
      '00:18:55', 'Frame of Ren seated by a train window with light streaking past',
      ['train', 'interior', 'motion', 'medium']),
    fixture('frame_005', 'Stairwell, red lantern', 'Yomawari Notes', 'EP 02', 'Mika',
      '00:09:17', 'Frame of Mika climbing a narrow stairwell lit by a red lantern',
      ['interior', 'lantern', 'stairs', 'close']),
    fixture('frame_006', 'Festival crowd, held still', 'Yomawari Notes', 'EP 05', 'Mika',
      '00:14:48', 'Frame of a festival crowd frozen mid-step under paper lanterns',
      ['festival', 'crowd', 'night', 'wide']),
    fixture('frame_007', 'Kitchen, two cups', 'Yomawari Notes', 'EP 05', 'Mika',
      '00:21:02', 'Frame of two cups on a kitchen counter in late afternoon light',
      ['interior', 'kitchen', 'quiet', 'medium']),
    fixture('frame_008', 'Shoreline, last train', 'Higan Shore', 'EP 11', 'Souta',
      '00:19:36', 'Frame of Souta on a dark shoreline as the last train crosses a bridge',
      ['sea', 'night', 'bridge', 'wide']),
    fixture('frame_009', 'Empty classroom, window seat', 'Higan Shore', 'EP 11', 'Souta',
      '00:23:10', 'Frame of an empty classroom with light falling on the window seat',
      ['classroom', 'afternoon', 'empty', 'medium']),
  ];

  AA.data = {
    FRAME_WIDTH: FRAME_WIDTH,
    FRAME_HEIGHT: FRAME_HEIGHT,
    FIXTURES: FIXTURES,
  };
})(typeof window !== 'undefined' ? window : globalThis);

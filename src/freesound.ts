import {
  FreesoundSearchResponse,
  FreesoundSoundData,
  SampleResult,
} from './types';

export const get_sample = function (
  freesound_api_key: string,
  audioCtx: AudioContext,
  query: string
): Promise<SampleResult> {
  return fetch(
    `https://freesound.org/apiv2/search/text/?query=${query}&page_size=30&token=${freesound_api_key}`
  )
    .then((x) => x.json() as Promise<FreesoundSearchResponse>)
    .then((x) => {
      const id = x.results[Math.floor(x.results.length * Math.random())].id;
      return get_sample_by_id(freesound_api_key, audioCtx, id);
    });
};

export const get_sample_by_id = function (
  freesound_api_key: string,
  audioCtx: AudioContext,
  sound_id: number
): Promise<SampleResult> {
  return fetch(
    `https://freesound.org/apiv2/sounds/${sound_id}/?token=${freesound_api_key}`
  )
    .then((x) => x.json() as Promise<FreesoundSoundData>)
    .then((data) =>
      fetch(`${data.previews['preview-hq-mp3']}?token=${freesound_api_key}`)
        .then((y) => y.arrayBuffer())
        .then((buffer) => audioCtx.decodeAudioData(buffer))
        .then((decoded) => ({
          buffer: decoded,
          freesound_data: data,
        }))
    );
};

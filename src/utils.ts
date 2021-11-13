import { access } from "fs";
import { MetaHTMLAttributes } from "react";

export enum BufferSource{
  FreeSound,
  Local
};

interface SourceMeta {sample_query: any, detail: {}};

export interface FreesoundMeta extends SourceMeta  { sample_query: string };
export interface LocalMeta extends SourceMeta { sample_query: null };

export type Layer<BufferSourceT extends BufferSource> = {
  id: number,
  toggles: boolean[],
  mute: boolean,
  playback_speed: number,
  cut: boolean,
  start: number,
  end: number,
  buffer: AudioBuffer | null,
  send_1: number,
  send_2: number,
  type: BufferSourceT,
  metadata: (BufferSourceT extends BufferSource.FreeSound ? FreesoundMeta : LocalMeta),
};

export type State = {
  layers: Layer<BufferSource>[]
}

export function repeat<Rep>(x: Rep, n: number):Rep[] {
  const r = [];
  for(let i=0; i<n; i++){
    r.push(x)
  }
  return r;
}

export const default_layer = function (sample_query: string, id: number):Layer<BufferSource.FreeSound> {
  return {
    id,
    // toggles: Array.apply(false, Array(Math.ceil(28*Math.random()+4))).map(x=> Math.random() >0.8 ? true : false),
    toggles: repeat(false, 8),
    mute: true,
    playback_speed: 1,
    cut: true,
    start: 0,
    end: 1,
    buffer: null,
    metadata: {sample_query, detail:{}},
    type: BufferSource.FreeSound,
    send_1: 0,
    send_2: 0
  }
}



export const defaultState = {
  // layers: ["bd","snare","clap","closed_hat", "open_hat", "low_tom","hi_tom"].map(default_layer)
  // layers: ["kick","snare","hat","tom","piano","bass","tink","ambience","bop"].map(default_layer)
  // layers: ["piano","melody","hat","bd","snare","flute"].map(default_layer)
  // layers: ["kick", "hat", "snare","tom","tom"].map(default_layer)
  // layers: ["piano", "orchestra", "flute", "strings", "guitar", "rap"].map(default_layer)
  layers: ["piano", "orchestra", "kick", "shaker", "hat", "snare"].reduce((acc,s, id) => ({...acc, s:default_layer(s, id)}), {})
  // layers: ["choir","choir","choir","choir","drum","drum","drum", "drum"].map(default_layer)
  // layers: ["hiphop","hiphop","hiphop","hiphop","hiphop","hiphop"].map(default_layer)
  // layers: ["drum","drum","drum","drum"].map(default_layer)
}

export function get_sample (freesound_api_key: string, ac: AudioContext, query: string) {
  return (
    fetch(
      `https://freesound.org/apiv2/search/text/?query=${query}&page_size=30&token=${freesound_api_key}`,
    ).then(x => {
      return x.json()
    })
      .then(x => {
        const id = x.results[Math.floor(x.results.length * Math.random())].id;
        return get_sample_by_id(freesound_api_key, ac, id);
      })
  )
}

const get_sample_by_id = function (freesound_api_key: string, ac: AudioContext, sound_id: string) {
  return (
    fetch(
      `https://freesound.org/apiv2/sounds/${sound_id}/?token=${freesound_api_key}`,
    ).then(x => x.json())
      .then(data =>
        fetch(`${data.previews['preview-hq-mp3']}?token=${freesound_api_key}`)
          .then(y => y.arrayBuffer()).then(buffer => ac.decodeAudioData(buffer))
          .then(decoded => {
            return { buffer: decoded, freesound_data: data }
          })
      )
  )
}

export const freesound = {
  get_sample, get_sample_by_id
}

export const clip = (x: number, low: number, high: number) => Math.min(Math.max(x, low), high);



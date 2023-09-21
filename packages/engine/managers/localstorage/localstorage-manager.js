export class LocalStorageManager extends EventTarget {
  getPlayerSpec() {
    const playerSpecString = localStorage.getItem('playerSpec');
    let playerSpec;
    if (playerSpecString) {
      playerSpec = JSON.parse(playerSpecString);
    } else {
      playerSpec = (Math.random() < 0.5 ?
        {
          name: 'Vipe 2185',
          bio: 'A blond-haired boy',
          // voiceEndpoint: 'elevenlabs:scillia',
          // voiceEndpoint: 'tiktalknet:Trixie',
          // voiceEndpoint: 'tiktalknet:Shining Armor',
          voiceEndpoint: 'elevenlabs:kaido',
          // avatarUrl: '/avatars/default_2195.vrm',
          // avatarUrl: '/avatars/default_2194.vrm',
          // avatarUrl: '/avatars/Yoll2.vrm',
          // avatarUrl: '/avatars/ann_liskwitch_v3.3_gulty.vrm',
          // avatarUrl: '/avatars/CornetVRM.vrm',
          // avatarUrl: '/avatars/Buster_Rabbit_V1.1_Guilty.vrm',
          // avatarUrl: '/avatars/Scilly_FaceTracking_v1_Darling.vrm',
          // avatarUrl: '/avatars/Scilly_FaceTracking_v3_Darling_2.vrm',
          // avatarUrl: '/avatars/Scilly_FaceTracking_v5_Darling.vrm',
          // avatarUrl: '/avatars/Scilly_FaceTracking_v6_Darling.vrm',
          // avatarUrl: '/avatars/scilly_psx.vrm',
          // avatarUrl: '/avatars/scilly_drophunter_v31.10_Guilty.vrm',
          avatarUrl: '/avatars/default_2185.vrm',
        }
      :
        {
          name: 'Vipe 1614',
          bio: 'A brown-haired girl',
          voiceEndpoint: 'elevenlabs:scillia',
          // avatarUrl: '/avatars/default_1933.vrm',
          // avatarUrl: '/avatars/default_2194.vrm',
          avatarUrl: '/avatars/default_1934.vrm',
        }
      );
      localStorage.setItem('playerSpec', JSON.stringify(playerSpec));
    }
    return playerSpec;
  }
  async setPlayerSpec(playerSpec) {
    const playerSpecString = JSON.stringify(playerSpec);
    localStorage.setItem('playerSpec', playerSpecString);

    this.dispatchEvent(new MessageEvent('playerspecupdate', {
      data: {
        playerSpec,
      },
    }));
  }

  getJwt() {
    const jwtString = localStorage.getItem('jwt');
    const jwt = jwtString ?
      JSON.parse(jwtString)
    :
      null;
    return jwt;
  }
  setJwt(jwt) {
    const jwtString = JSON.stringify(jwt);
    localStorage.setItem('jwt', jwtString);

    this.dispatchEvent(new MessageEvent('jwtupdate', {
      data: {
        jwt,
      },
    }));
  }
  deleteJwt() {
    localStorage.removeItem('jwt');

    this.dispatchEvent(new MessageEvent('jwtupdate', {
      data: {
        jwt: null,
      },
    }));
  }

  getControlsVisible() {
    const controlsVisibleString = localStorage.getItem('controlsVisible');
    const controlsVisible = controlsVisibleString ?
      JSON.parse(controlsVisibleString)
    :
      true;
    return controlsVisible;
  }
  setControlsVisible(controlsVisible) {
    const controlsVisibleString = JSON.stringify(controlsVisible);
    localStorage.setItem('controlsVisible', controlsVisibleString);

    this.dispatchEvent(new MessageEvent('controlsvisibleupdate', {
      data: {
        controlsVisible,
      },
    }));
  }
  toggleControlsVisible() {
    this.setControlsVisible(!this.getControlsVisible());
  }
}
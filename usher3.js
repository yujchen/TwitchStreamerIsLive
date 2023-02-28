const https = require('https');

async function isChannelLive(channelName) {
  const clientID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

  const gqlQuery = {
    operationName: 'PlaybackAccessToken',
    query:
      'query PlaybackAccessToken($login: String!, $isLive: Boolean!, $playerType: String!) { streamPlaybackAccessToken(channelName: $login, params: {platform: \"web\", playerBackend: \"mediaplayer\", playerType: $playerType}) @include(if: $isLive) { value signature __typename } }',
    variables: { isLive: true, login: channelName, playerType: 'site' },
  };

  try {
    //From TwitchGQL we get the token, this token validates the existence of the user, which then can be used to redeemed at usherttv for livestream files if the streamer is live.
    let tokenResponse = await sendRequest('gql.twitch.tv','POST', '/gql', gqlQuery, clientID); 
    if (tokenResponse.statusCode === 404){
        //console.log("it is 404");
        return 404;
    }
    //console.log(tokenResponse);
    tokenResponse = JSON.parse(tokenResponse);
    if (!tokenResponse.data || !tokenResponse.data.streamPlaybackAccessToken) {
        console.log("ERROR");
        console.log(tokenResponse);
        return 2; //Error getting response
    }
    const { value: token, signature } = tokenResponse.data.streamPlaybackAccessToken;
    const streamResponse = await sendRequest(
        'usher.ttvnw.net',
        'GET',
        `/api/channel/hls/${channelName}.m3u8?player=twitchweb&p=123456&type=any&allow_source=true&allow_audio_only=true&allow_spectre=false&sig=${signature}&token=${encodeURIComponent(token)}&fast_bread=True`,
        null,
        null
    );
    //console.log(streamResponse);
    if (streamResponse === 404){
        //console.log(channelName +" offline");
        return 404;
    }
    //console.log(streamResponse);
    if (streamResponse.includes('transcode_does_not_exist')) {
        return 0;
    } else if (streamResponse.includes('#EXTM3U')) {
        //console.log(channelName+ " online!");
        return 1;
    } else {
        return 0;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

function sendRequest(host,method, path, data, clientID) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path,
      method,
      headers: {
        'Client-ID': clientID,
      },
    };
    //console.log(host+path);
    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 404){
            resolve(res.statusCode);
        }
        resolve(responseBody);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      const body = JSON.stringify(data);
      req.write(body);
    }

    req.end();
  });
}

async function ICLmain(CN) {
    try {
      //const channelName = CN;
      const liveStatus = await isChannelLive(CN);
      return liveStatus;
      //console.log(`Live status of ${channelName}: ${liveStatus}`);
    } catch (error) {
      console.error(error);
    }
}

let CN = process.argv[2];
ICLmain(CN);
module.exports.ICLmain = ICLmain;
module.exports.isChannelLive = isChannelLive;

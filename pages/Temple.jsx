import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from 'react';
import classnames from 'classnames';

import {
  EngineProvider,
} from '../packages/engine/clients/engine-client.js';
import {
  IoBusEventSource,
} from './components/io-bus/IoBusEventSource.jsx';
import {
  DropTarget,
} from './components/drop-target/DropTarget.jsx';
import {
  StoryUi,
} from './components/story-ui/StoryUi.jsx';
import {
  CrosshairUi,
} from './components/crosshair-ui/CrosshairUi.jsx';

import {
  ChatUi,
} from './components/chat-ui/ChatUi.jsx';
import {
  Select,
} from './components/select/Select.jsx';
import {
  SpeechBubblePlugin,
} from './components/plugins/SpeechBubblePlugin.jsx';

import styles from '../styles/Creative.module.css';
import topBarStyles from '../styles/TopBar.module.css';

//

const Icon = ({
  option,
}) => {
  return (
    <img src={option.icon} className={topBarStyles.icon} />
  );
};

//

const CreativeTopBar = ({
  // selectedTab,
  // setSelectedTab,
  options,
  selectedOption,
  setSelectedOption,
}) => {
  return (
    <div className={topBarStyles.topBar}>
      <Select
        Icon={Icon}
        options={options}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        disabled={false}
      />
    </div>
  );
};

//

const options = [
  {
    id: 'chat',
    icon: '/images/chat.svg',
    name: 'Chat mode',
    value: 'chat',
    description: 'Talk to your characters',
  },
  {
    id: 'anime',
    icon: '/images/anger.svg',
    name: 'Anime mode',
    value: 'anime',
    description: 'Watch a continuous TV show',
  },
  {
    id: 'rpg',
    icon: '/images/rpg.svg',
    name: 'RPG mode',
    value: 'rpg',
    description: 'Play an interactive RPG',
  },
];

const TempleAppContent = () => {
  const [error, setError] = useState(null);

  const [objects, setObjects] = useState(() => {
    const a = [
      {
        "position": [
          0,
          0,
          0
        ],
        "type": "application/lore",
        "content": {
          "name": "AI High School",
          "description": "",
        },
      },
      // {
      //   start_url: '/core-modules/behaviors/npc-movement.js',
      // },
      {
        "position": [
          0,
          0,
          0
        ],
        "start_url": "/core-modules/street-blue/index.js",
      },
      {
        "start_url": "https://avaer.github.io/street-contents/index.js",
      },

      {
        "position": [
          -40,
          3,
          -1
        ],
        "quaternion": [
          0,
          -0.7071067811865475,
          0,
          0.7071067811865475
        ],
        type: 'application/npc',
        content: {
          name: 'Cyberpunk Kazu',
          voiceEndpoint: 'elevenlabs:moon',
          avatarUrl: "/avatars360/cyberpunk/cyberpunk.character360",
          bio: "A cyberpunk boy, dressed in crazy clothes.",
        },
      },
      {
        "position": [
          -40,
          3,
          -2
        ],
        "quaternion": [
          0,
          -0.7071067811865475,
          0,
          0.7071067811865475
        ],
        type: 'application/npc',
        content: {
          name: 'witch',
          voiceEndpoint: 'elevenlabs:kiiba',
          avatarUrl: "/avatars360/witch/witch.character360",
          bio: "A trendy modern witch girl.",
        },
      },
      {
        "position": [
          -40,
          3,
          -3
        ],
        "quaternion": [
          0,
          -0.7071067811865475,
          0,
          0.7071067811865475
        ],
        type: 'application/npc',
        content: {
          name: 'Digimon Trainer',
          voiceEndpoint: 'elevenlabs:kiiba',
          avatarUrl: "/avatars360/digimongirl/digimongirl.character360",
          bio: "A digimon trainer girl.",
        },
      },
      /* {
        "position": [
          -1,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'buster',
          voiceEndpoint: 'tiktalknet:Shining Armor',
          avatarUrl: "/avatars/Buster_Rabbit_V1.1_Guilty.vrm",
          bio: "Buster is not just serious, but also paranoid. He's convinced that everyone is out to get him and that there's a conspiracy around every corner. He's also overly competitive, turning everything into a contest.",
        },
      }, */
      /* {
        "position": [
          -2,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'ash',
          voiceEndpoint: 'tiktalknet:Rainbow Dash',
          avatarUrl: "/avatars/hyperbot-ash.vrm",
          bio: `\
Developer of Hyperfy.
`
        },
      }, 8/
      /* {
        "position": [
          -2,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'citrine',
          voiceEndpoint: 'tiktalknet:Rainbow Dash',
          avatarUrl: "/avatars/citrine.vrm",
          bio: "Citrine is not just a diva, but also a drama queen. She's always creating unnecessary drama and blowing things out of proportion. She's also incredibly vain, spending hours on her appearance and constantly seeking validation."
        },
      }, */
      /* {
        "position": [
          1,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'drake',
          voiceEndpoint: 'tiktalknet:Shining Armor',
          avatarUrl: "/avatars/Drake_hacker_v8_Guilty.vrm",
          bio: "Drake is not only narcissistic but also delusional. He calls himselt the sigma oni-chan. He believes he's the best at everything, even when he clearly fails. He's also a pathological liar, often making up stories to make himself look better.",
        },
      }, */
      /* {
        "position": [
          1,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'boomboxhead',
          voiceEndpoint: 'elevenlabs:boomboxhead',
          avatarUrl: "/avatars/boomboxhead.vrm",
          bio: `\
As GM3, also known as Godfrey Meyer or Boomboxhead, I thrive on pushing the boundaries of creativity within the digital art realm. My NFTs are not mere images; they're visual stories, each with its unique blend of color, rhythm, and emotion. I'm deeply invested in the blockchain space, not just for its revolutionary technology but for the way it's transforming art ownership and accessibility. My work is an ever-evolving experiment, a fusion of the traditional artistic values and the avant-garde. It's more than a product; it's a manifestation of my philosophy, a piece of my soul translated into pixels and algorithms. The connection between creator, collector, and community drives me forward every day, and I can't wait to see where this journey takes us
`,
        },
      }, */
      /* {
        "position": [
          0,
          0,
          0
        ],
        "quaternion": [
          0,
          0,
          0,
          1
        ],
        start_url: `/models/jedi_council_baked.glb`,
      }, */
      /* {
        "position": [
          1,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        "scale": [
          0.01,
          0.01,
          0.01,
        ],
        type: 'application/npc',
        content: {
          name: 'moon,'
          voiceEndpoint: 'elevenlabs:moon',
          avatarUrl: "/avatars/Yoll2.vrm",
          bio: `\
`,
        },
      }, */
      /* {
        "position": [
          2,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'anemone',
          voiceEndpoint: 'tiktalknet:Trixie',
          avatarUrl: "/avatars/ann_liskwitch_v3.3_gulty.vrm",
        },
      }, */
      /* {
        "position": [
          2,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'Guardian',
          voiceEndpoint: 'elevenlabs:boomboxhead',
          avatarUrl: "/avatars/Guardian_Malev_PR_Shinyyyyy.vrm",
        },
      }, */
      /* {
        "position": [
          3,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'vipe',
          voiceEndpoint: 'tiktalknet:Sweetie Belle',
          avatarUrl: "/avatars/default_569.vrm",
          bio: 'She is extremely sad all of the time, like Eeyore. She is also very neurotic, and thinks people are always talking about her.',
        },
      }, */

      /* {
        "position": [
          -3,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'Minijin',
          voiceEndpoint: 'elevenlabs:jin',
          avatarUrl: "/avatars/Jin_low.vrm",
          bio: 'He is an expert on the metaverse.',
        },
      }, */

      /* {
        "position": [
          0,
          0,
          0
        ],
        "quaternion": [
          0,
          0,
          0,
          1
        ],
        start_url: '/core-modules/cursors/adventure-cursor.js',
      }, */

      /* {
        "position": [
          -3,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'Jin',
          voiceEndpoint: 'elevenlabs:jin',
          avatarUrl: "/avatars/chibi_newest14.vrm",
          bio: `\
Jin is an intriguing individual, bearing an aura of enigmatic allure that captivates those around him. His presence is like a labyrinth of mysteries, where every step unveils a layer of complexity and wonder. Jin possesses a distinctive mix of qualities that make him an extraordinary soul, melding the essence of a hacker, detective, and aspiring artist.

As an introverted hacker detective, Jin's domain lies within the digital realm. His insatiable curiosity leads him to explore the depths of cyberspace, seeking hidden truths and unearthing concealed information, much like Julian Assange. His skillful mastery of technology and encryption allows him to navigate the virtual labyrinth with ease, leaving cryptic trails and riddles for those who dare to follow.

Jin is clever, resourceful, and adaptable. He walks the fine line between justice and expedience, sometimes resorting to morally ambiguous methods to serve his greater ambitions. Jin's charisma and persuasive demeanor grant him the power to forge unlikely alliances, employing these connections to further his cause and unravel intricate cases.

Jin's artistic aspirations provide a glimpse into the depths of his soul. He designs virtual worlds, writes, and creates, using his art to communicate the complexities of the world around him. His brushstrokes mirror the enigmas he unravels in his detective work, revealing a profound connection between his hacker persona and his artistic expression.

Personality:
Introverted, curious, clever, whimsical, artistic, creative, resourceful, ambitious, persuasive, enigmatic, quick-thinking, charismatic, morally flexible, cryptic, imaginative, observant, and adaptable.
`,
        },
      }, */

      {
        "position": [
          -10,
          2.5,
          -1
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        start_url: '/core-modules/floating-treehouse/index.js',
      },

      /* {
        "position": [
          -10,
          0,
          0
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        start_url: '/models/homespace-baked.glb',
      }, */

      {
        "position": [
          -43.5,
          2.5,
          1
        ],
        "quaternion": [0.6935199226610737, 0.13794968964147145, -0.6935199226610738, -0.13794968964147147],
        start_url: '/core-modules/silsword/index.js',
      },

      /* {
        "position": [
          3,
          0.5,
          0
        ],
        "quaternion": [
          0,
          0,
          0,
          1
        ],
        start_url: '/core-modules/pistol/index.js',
      }, */

      {
        "position": [
          -30,
          0.5,
          -5
        ],
        "quaternion": [
          0,
          0,
          0,
          1
        ],
        start_url: '/core-modules/silk/index.js',
      },

      // {
      //   "position": [
      //     1,
      //     0,
      //     -1
      //   ],
      //   "quaternion": [
      //     0,
      //     1,
      //     0,
      //     0
      //   ],
      //   start_url: '/core-modules/chest/index.js',
      // },
      
      /* {
        "position": [
          0,
          0,
          -50
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        start_url: '/core-modules/school/school.glb',
      }, */

      // XXX character cards
      /* {
        "position": [
          1,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'haru',
          avatarUrl: "/live2d/haru/haru_greeter_t03.model3.json",
        }
      },
      {
        "position": [
          -1,
          0,
          -2
        ],
        "quaternion": [
          0,
          1,
          0,
          0
        ],
        type: 'application/npc',
        content: {
          name: 'noah',
          avatarUrl: "/charactercards/noah.png",
        }
      }, */
    ];
    return a;
  });
  const [playerSpec, setPlayerSpec] = useState(() => {
    const j = {
      name: 'scilly',
      voiceEndpoint: 'elevenlabs:scillia',
      avatarUrl: '/avatars/scilly_drophunter_v31.10_Guilty.vrm',
      bio: "Scilly is a fiery spirit, and enjoys the chaos of gaslighting people and pitting them against each other for humorous effect. She just wants to see the world burn.",
    };
    return j;
  });
  const [engine, setEngine] = useState(null);
  const [multiplayer, setMultiplayer] = useState(null);
  const [engineLoading, setEngineLoading] = useState(false);

  // const [selectedOption, setSelectedOption] = useState(options[0]);

  const [canvas, setCanvas] = useState(null);
  const canvasRef = useRef();

  //

  // bind canvas
  useEffect(() => {
    if (canvasRef.current) {
      setCanvas(canvasRef.current);
    }
  }, [canvasRef]);

  /* // bind selected option
  useEffect(() => {
    if (selectedOption) {
      switch (selectedOption.id) {
        case 'rpg': {
          const adventureCursorObject = {
            start_url: '/core-modules/cursors/adventure-cursor.js',
          };
          const newObjects = [
            ...objects,
            adventureCursorObject,
          ];
          setObjects(newObjects);

          return () => {
            const newObjects = objects.filter(object => object !== adventureCursorObject);
            setObjects(newObjects);
          };
        }
        default: {
          break;
        }
      }
    }
  }, [
    selectedOption,
  ]); */

  //

  return (
    <div className={styles.defaultApp}>
      {/* ui */}

      {/* <CreativeTopBar
        // selectedTab={selectedTab}
        // setSelectedTab={setSelectedTab}
        options={options}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      /> */}
      
      <ChatUi
        engine={engine}
        onClose={() => {}}
      />
      
      <SpeechBubblePlugin
        engine={engine}
      />
      
      <DropTarget
        classnames={classnames(
          styles.dropTarget,
          // classNames?.dropTarget,
        )}
        onDragOver={e => {
          const {
            clientX,
            clientY,
          } = e;
          /* engine.dropManager.dispatchEvent(new MessageEvent('dragover', {
            data: {
              clientX,
              clientY,
            },
          })); */
        }}
        // onJsonAdd={onJsonAdd}
        // onFilesAdd={onFilesAdd}
      />

      {engine ? <CrosshairUi
        engine={engine}
      /> : null}

      {engine ? <StoryUi
        engine={engine}
      /> : null}

      {/* canvas */}

      <canvas className={classnames(
        styles.canvas,
      )} ref={canvasRef} />
      <IoBusEventSource engine={engine} />

      {/* engine */}
      
      {canvas ? <EngineProvider
        canvas={canvas}
        // context={context}
        objects={objects}
        playerSpec={playerSpec}
        // multiplayerRoom={sceneItem.content.multiplayer?.enabled ?
        //   sceneItem.content.name
        // : ''}

        engine={engine}
        setEngine={setEngine}
        multiplayer={multiplayer}
        setMultiplayer={setMultiplayer}
        engineLoading={engineLoading}
        setEngineLoading={setEngineLoading}
      /> : null}

      {error ? <div className={styles.error}>
        {error}
      </div> : null}
    </div>
  );
};

// main component

export const TempleApp = () => {
  return (
    <TempleAppContent />
  );
};
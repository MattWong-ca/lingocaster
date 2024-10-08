import { serveStatic } from '@hono/node-server/serve-static'
import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as neynarHub } from 'frog/hubs'
import { neynar } from "frog/middlewares"
import { createSystem } from 'frog/ui'
import { handle } from 'frog/vercel'
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai"
import dotenv from 'dotenv'
dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const openAIPayload = `
You're a translation bot that helps people learn Spanish, similar to Duolingo. In ONLY JSON, respond with:

1. Translation of the text to Spanish
2. Translations of the 4 most important words/phrases (eg. give me a dictionary like "Hello" --> "Hola")
3. Generate 2 multiple choice questions (question in English, with 4 Spanish answers, no a/b/c/d in front of responses), and the correct answer (eg. it can be as simple as "Translate [word]" or "What does [word] mean")
4. Generate 2 true/false questions similar to the multiple choice (eg. [phrase] means [phrase] in Spanish), and the correct answer as a string (eg. "true"/"false")

Send me all of this in JSON. The sections should be "translation", "phrase_translation", "multiple_choice_questions", and "true_false_questions"

Here's the text:
`;

const { Image, Text, vars } = createSystem({
  fonts: {
    default: [
      {
        name: 'Poppins',
        source: 'google',
        weight: 400,
      }
    ],
    manrope: [
      {
        name: 'Poppins',
        source: 'google',
        weight: 700,
      },
      {
        name: 'Poppins',
        source: 'google',
        weight: 500
      }
    ],
  },
  colors: {
    white: '#FFFFFF',
    green: '#58CC02',
    blue: '#2e6cbf',
    red: '#892827'
  }
})

// Define the State type
type State = {
  openaiResponse: any | null;
  points: number;
  streak: number;
}

// Initialize the Frog app with the State type and initial state
export const app = new Frog<{ State: State }>({
  title: 'Lingocaster',
  hub: neynarHub({ apiKey: process.env.NEYNAR_API_KEY! }),
  ui: { vars },
  assetsPath: "/",
  basePath: "/api",
  initialState: {
    openaiResponse: null,
    points: 0,
    streak: 1
  }
}).use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY!,
    features: ["interactor", "cast"],
  })
);

app.frame('/', (c) => {
  return c.res({
    action: '/translation',
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
          padding: '20px',
        }}
      >
        {/* Circular image */}
        <div style={{
          borderRadius: '50%',
          display: 'flex',
          width: '160px',
          height: '160px',
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Image src="/duolingo.png" />
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            color: 'white',
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '15px',
          }}
        >
          <Text size="48" weight="700">Lingocaster</Text>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            color: 'white',
            fontSize: '18px',
            marginBottom: '30px',
            maxWidth: '85%',
          }}
        >
          <Text size="20" font="manrope" weight="400">Learn a new language, earn rewards with streaks, & challenge friends in PYUSD!</Text>

        </div>
      </div>
    ),
    intents: [
      <Button action="/translation">Start learning!</Button>,
    ],
  })
})

app.frame('/translation', async (c) => {
  const castText = c.var.cast?.text;
  const { deriveState } = c;

  const state = await deriveState(async (previousState) => {
    if (!previousState.openaiResponse) {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: openAIPayload + `\n${castText}` },
        ],
        model: "gpt-3.5-turbo",
      });
      previousState.openaiResponse = JSON.parse(completion.choices[0].message.content!);
    }
  });

  const translation = state.openaiResponse?.translation || '';

  return c.res({
    action: '/phrases',
    image: (
      <div
        style={{
          alignItems: 'flex-start',
          background: '#58CC02',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <Text
            font="default"
            size="32"
            weight="700"
            color="white"
          >
            Translation:
          </Text>
        </div>

        {/* White rounded rectangle */}
        <div
          style={{
            display: 'flex',
            background: 'white',
            borderRadius: '15px',
            lineHeight: '1',
            flexGrow: 1,
            padding: '20px',
            width: '100%',
          }}
        >
          {/* Blue sample text */}
          <div style={{ display: 'flex', color: 'black' }}>
            <Text
              font="default"
              size="20"
              color="blue"
            >
              {translation}
            </Text>
          </div>
        </div>
      </div>
    ),
    intents: [
      <Button action="/">Back</Button>,
      <Button>Next</Button>,
    ],
  })
})

app.frame('/phrases', (c) => {
  const { deriveState } = c;
  const state = deriveState((previousState) => {
  });

  const phraseTranslation = state.openaiResponse?.phrase_translation || {};
  const firstEntry = Object.entries(phraseTranslation)[0] || ['', ''];
  const [english, spanish] = firstEntry;

  const secondEntry = Object.entries(phraseTranslation)[1];
  const [english2, spanish2] = secondEntry;

  const thirdEntry = Object.entries(phraseTranslation)[2];
  const [english3, spanish3] = thirdEntry;

  const forthEntry = Object.entries(phraseTranslation)[3];
  const [english4, spanish4] = forthEntry;

  return c.res({
    image: (
      <div
        style={{
          alignItems: 'flex-start',
          background: '#58CC02',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <Text
            font="default"
            size="32"
            weight="700"
            color="white"
          >
            Important words/phrases:
          </Text>
        </div>

        {/* White rounded rectangle */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '15px',
            flexGrow: 1,
            padding: '20px',
            width: '100%',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ display: 'flex', marginRight: '10px' }}>
              <Text
                font="default"
                size="18"
                color="blue"
                weight="700"
              >
                {`${english}:`}
              </Text>
            </div>
            <Text
              font="default"
              size="18"
              color="blue"
              weight="400"
            >
              {`${spanish}`}
            </Text>
          </div>
          {secondEntry && (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{ display: 'flex', marginRight: '10px' }}>
                <Text
                  font="default"
                  size="18"
                  color="blue"
                  weight="700"
                >
                  {`${english2}:`}
                </Text>
              </div>
              <Text
                font="default"
                size="18"
                color="blue"
                weight="400"
              >
                {`${spanish2}`}
              </Text>
            </div>
          )}

          {thirdEntry && (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{ display: 'flex', marginRight: '10px' }}>
                <Text
                  font="default"
                  size="18"
                  color="blue"
                  weight="700"
                >
                  {`${english3}:`}
                </Text>
              </div>
              <Text
                font="default"
                size="18"
                color="blue"
                weight="400"
              >
                {`${spanish3}`}
              </Text>
            </div>
          )}
          {forthEntry && (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{ display: 'flex', marginRight: '10px' }}>
                <Text
                  font="default"
                  size="18"
                  color="blue"
                  weight="700"
                >
                  {`${english4}:`}
                </Text>
              </div>
              <Text
                font="default"
                size="18"
                color="blue"
                weight="400"
              >
                {`${spanish4}`}
              </Text>
            </div>
          )}
        </div>
      </div>
    ),
    intents: [
      <Button action="/translation">Back</Button>,
      <Button action="/quiztime">Next</Button>,
    ],
  })
})

app.frame('/quiztime', (c) => {
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
          justifyContent: 'center',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '8px' }}>
          <Text
            font="default"
            size="64"
            weight="700"
            color="white"
          >
            Quiz Time!
          </Text>
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <Text
            font="default"
            size="24"
            weight="400"
            color="white"
          >
            4 questions
          </Text>
        </div>
      </div>
    ),
    intents: [
      <Button action="/phrases">Back</Button>,
      <Button action="/q1">Start Quiz!</Button>,
    ],
  })
})

app.frame('/q1', async (c) => {
  const interactorUsername = c.var.interactor?.username;
  const { deriveState } = c;
  const state = deriveState((previousState) => {
  });

  const q1 = state.openaiResponse?.multiple_choice_questions[0].question;
  const answers = state.openaiResponse?.multiple_choice_questions[0].answers;

  const { data: existingUser } = await supabase
    .from('radar')
    .select('username')
    .eq('username', interactorUsername)
    .single();

  if (!existingUser) {
    await supabase
      .from('radar')
      .insert([
        { username: interactorUsername }
      ]);
  }

  return c.res({
    action: '/q2',
    image: (
      <div
        style={{
          alignItems: 'flex-start',
          background: '#58CC02',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <Text
            font="default"
            size="24"
            weight="700"
            color="white"
          >
            {q1}
          </Text>
        </div>

        {/* Answer options */}
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 0)}. ${answers[0]}`}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 1)}. ${answers[1]}`}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 2)}. ${answers[2]}`}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 3)}. ${answers[3]}`}
          </Text>
        </div>
      </div>
    ),
    intents: [
      <Button value={answers[0]}>a</Button>,
      <Button value={answers[1]}>b</Button>,
      <Button value={answers[2]}>c</Button>,
      <Button value={answers[3]}>d</Button>,
    ],
  })
})

app.frame('/q2', (c) => {
  const { deriveState, buttonValue } = c;
  const state = deriveState(() => {});

  const q2 = state.openaiResponse?.multiple_choice_questions[1].question;
  const answers = state.openaiResponse?.multiple_choice_questions[1].answers;
  const correctQ1Answer = state.openaiResponse?.multiple_choice_questions[0].correct_answer;
  if (buttonValue === correctQ1Answer) {
    state.points += 100;
  }
  return c.res({
    action: '/q3',
    image: (
      <div
        style={{
          alignItems: 'flex-start',
          background: '#58CC02',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <Text
            font="default"
            size="24"
            weight="700"
            color="white"
          >
            {q2}
          </Text>
        </div>

        {/* Answer options */}
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 0)}. ${answers[0]}`}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 1)}. ${answers[1]}`}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 2)}. ${answers[2]}`}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            marginBottom: '15px',
            marginLeft: '20px',
            borderRadius: '10px',
            padding: '10px',
            width: '100%',
          }}
        >
          <Text
            font="manrope"
            weight="500"
            size="18"
            color="white"
          >
            {`${String.fromCharCode(97 + 3)}. ${answers[3]}`}
          </Text>
        </div>
      </div>
    ),
    intents: [
      <Button value={answers[0]}>a</Button>,
      <Button value={answers[1]}>b</Button>,
      <Button value={answers[2]}>c</Button>,
      <Button value={answers[3]}>d</Button>,
    ],
  })
})

app.frame('/q3', (c) => {
  const answerOptions = ['True', 'False'];
  const { deriveState, buttonValue } = c;
  const state = deriveState((previousState) => { });
  const q3 = state.openaiResponse?.true_false_questions[0].question;

  const correctQ2Answer = state.openaiResponse?.multiple_choice_questions[1].correct_answer;
  if (buttonValue === correctQ2Answer) {
    state.points += 100;
  }

  return c.res({
    action: '/q4',
    image: (
      <div
        style={{
          alignItems: 'flex-start',
          background: '#58CC02',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <Text
            font="default"
            size="24"
            weight="700"
            color="white"
          >
            {q3}
          </Text>
        </div>

        {/* Answer options */}
        {answerOptions.map((option, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              marginBottom: '15px',
              marginLeft: '20px',
              borderRadius: '10px',
              padding: '10px',
              width: '100%',
            }}
          >
            <Text
              font="manrope"
              weight="500"
              size="18"
              color="white"
            >
              {`${String.fromCharCode(97 + index)}. ${option}`}
            </Text>
          </div>
        ))}
      </div>
    ),
    intents: [
      <Button value="true">True</Button>,
      <Button value="false">False</Button>,
    ],
  })
})

app.frame('/q4', (c) => {
  const answerOptions = ['True', 'False'];
  const { deriveState, buttonValue } = c;
  const state = deriveState((previousState) => { });
  const q4 = state.openaiResponse?.true_false_questions[1].question;

  const correctQ3Answer = state.openaiResponse?.true_false_questions[0].correct_answer;
  if (buttonValue === correctQ3Answer) {
    state.points += 100;
  }

  return c.res({
    action: '/points',
    image: (
      <div
        style={{
          alignItems: 'flex-start',
          background: '#58CC02',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <Text
            font="default"
            size="24"
            weight="700"
            color="white"
          >
            {q4}
          </Text>
        </div>

        {/* Answer options */}
        {answerOptions.map((option, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              marginBottom: '15px',
              marginLeft: '20px',
              borderRadius: '10px',
              padding: '10px',
              width: '100%',
            }}
          >
            <Text
              font="manrope"
              weight="500"
              size="18"
              color="white"
            >
              {`${String.fromCharCode(97 + index)}. ${option}`}
            </Text>
          </div>
        ))}
      </div>
    ),
    intents: [
      <Button value="true">True</Button>,
      <Button value="false">False</Button>,
    ],
  })
})

app.frame('/points', (c) => {
  const { deriveState, buttonValue } = c;
  const state = deriveState((previousState) => { });

  const correctQ4Answer = state.openaiResponse?.true_false_questions[1].correct_answer;
  if (buttonValue === correctQ4Answer) {
    state.points += 100;
  }

  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
          justifyContent: 'center',
          lineHeight: '0.9',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex' }}>
          <Text
            font="default"
            size="64"
            weight="700"
            color="white"
          >
            {`+${state.points}`}
          </Text>
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <Text
            font="default"
            size="24"
            weight="400"
            color="white"
          >
            points!
          </Text>
        </div>
        <div style={{ display: 'flex', marginTop: '50px' }}>
          <Text
            font="default"
            size="18"
            weight="400"
            color="white"
          >
            {`You're now at ${state.points} points for the week!`}
          </Text>
        </div>
      </div>
    ),
    intents: [
      <Button action="/streak">Next</Button>,
    ],
  })
})

app.frame('/streak', async (c) => {
  const interactorUsername = c.var.interactor?.username;
  const { data } = await supabase
    .from('radar')
    .select('streak')
    .eq('username', interactorUsername)
    .single();

  const count = data?.streak ? data.streak + 1 : 1;
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: '#e9e0cb',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '20px',
        }}
      >
        <div style={{
          display: 'flex',
          width: '100%',
          overflow: 'hidden'
        }}>
          <Image src={`/${count}.png`} />
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', marginTop: '35px' }}>
          <Text
            font="default"
            size="24"
            weight="500"
            color="red"
          >
            {`${count} day streak! Mint your NFT:`}
          </Text>
        </div>
      </div>
    ),
    intents: [
      <TextInput placeholder="Address..." />,
      <Button action="/bet">Mint / Skip</Button>,
    ],
  })
})

app.frame('/bet', async (c) => {
  const { inputText } = c;
  const interactor = c.var.interactor?.username;

  if (inputText && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(inputText)) {
    await fetch('https://lingo-caster.vercel.app/api/mint-nft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient: inputText }),
    });
  }

  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '40px',
          justifyContent: 'flex-start',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', marginBottom: '60px', marginTop: '20px' }}>
          <Text
            font="default"
            size="32"
            weight="700"
            color="white"
          >
            Wanna bet...
          </Text>
        </div>

        {/* Two columns */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%'
        }}>
          {/* Left column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '45%'
          }}>
            <Text
              font="default"
              size="24"
              weight="700"
              color="white"
            >
              On Yourself
            </Text>
            <div
              style={{ display: 'flex', textAlign: 'center', padding: '10px', marginTop: '10px' }}
            >
              <Text
                font="default"
                size="18"
                weight="400"
                color="white"
              >
                Play for 30 days in a row and earn PYUSD from a weighted pool!
              </Text>
            </div>
          </div>

          {/* Right column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '45%'
          }}>
            <Text
              font="default"
              size="24"
              weight="700"
              color="white"
            >
              Against a Friend
            </Text>
            <div
              style={{ display: 'flex', textAlign: 'center', padding: '10px', marginTop: '10px' }}
            >
              <Text
                font="default"
                size="18"
                weight="400"
                color="white"
              >
                Challenge a friend and set your own terms in PYUSD!

              </Text>
            </div>
          </div>
        </div>
      </div>
    ),
    intents: [
      <Button.Link href={`http://localhost:3000/bet?interactor=${interactor}`}>Bet on Myself</Button.Link>,
      <Button.Link href={`http://localhost:3000/bet?interactor=${interactor}`}>Bet a Friend</Button.Link>,
    ],
  })
})

app.castAction("/action", async (c) => {
  return c.frame({ path: '/' })
},
  { name: "Lingo!", icon: "typography" }
);

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== "undefined";
const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);

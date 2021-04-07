import { useState } from "react";
import axios from "axios";
import spinnerSrc from "./spinner.svg";
import { v4 as uuid } from "uuid";
import Tree from "react-d3-tree";
import { useCenteredTree } from "./helpers";

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const URL = "https://api.openai.com/v1/engines/davinci/completions";
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};
console.log(process.env);
const solvePrompt = (question) => {
  return {
    prompt: `The best way to solve a hard problem is to break it up into as many components as possible. Here are a few examples of hard problems and the list of steps needed to solve them.\n\nProblem: How do I find love?\n1. Build confidence in yourself. You cannot find love if you do not first love yourself.\n2. Be active in the real world. Find hobbies, get involved in organizations, go to the gym, build friends, etc. Before you find a partner you must have friends.\n3. Practice communication skills. Learn how to talk about yourself and listen to others. This will help you build better relationships.\n4. Get outside your comfort zone. If you are not comfortable talking to strangers, start small. Talk to a cashier, or sit with a stranger at lunch.\n\nProblem: How can I get rich without getting lucky?\n1. Seek wealth, not money or status. Wealth is having assets that earn while you sleep. Money is how we transfer time and wealth. Status is your place in the social hierarchy.\n2. Ignore people playing status games. They gain status by attacking people playing wealth creation games.\n3. You will get rich by giving society what it wants but does not yet know how to get. At scale.\n4. Pick business partners with high intelligence, energy, and, above all, integrity.\n\nProblem: How do I get a higher GPA?\n1. Find a mentor. A good mentor will help you figure out what you do and do not know and set goals for each semester.\n2. Make a list of your GPA goals for each semester. Have a goal for each class you take.\n3. Have a goal for each class of the GPA you want to have at the end of the semester.\n4. Make a list of everything you can do to get that grade.\n5. Make a schedule for completing each item on the list.\n6. Follow the schedule.\n7. Keep going. Do not stop until you get where you want to go.\n\nProblem: ${question}\n1.`,
    temperature: 0.7,
    max_tokens: 300,
    top_p: 1,
    frequency_penalty: 0.5,
    presence_penalty: 0,
    stop: ["Problem:"],
  };
};

async function solveProblem(question, depth) {
  if (depth === 0) return [];
  // returns an object for a question
  const data = solvePrompt(question.trim());
  try {
    const res = await axios.post(URL, data, { headers });
    const out = res.data.choices[0].text;
    let lines = out.split("\n").filter((line) => line.trim() !== "");
    let statements = lines.map((line) => line.split(".")[1].trim());

    let nodes = [];
    for (const s of statements) {
      // const question = await toQuestion(s);
      nodes.push({
        name: s,
        question: s,
        id: uuid(),
        children: await solveProblem(question, depth - 1),
      });
    }
    return nodes;
  } catch (error) {
    console.error(error);
  }
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [tree, setTree] = useState({});
  const [showSpinner, setShowSpinner] = useState(false);
  const [translate, containerRef] = useCenteredTree();

  async function onSubmit() {
    // ignoring empty textarea
    if (problem.trim() === "") return;

    setTree({});
    setIsLoading(true);
    let children = await solveProblem(problem, 1);
    setTree({
      children: children,
      name: problem.trim(),
    });

    setIsLoading(false);
    console.log(tree);

    return;
  }

  async function onNodeClick(node) {
    console.log(node);
    if (!node) return;
    setShowSpinner(true);

    const newTree = await generateChildrenForId(tree, node.id);
    setTree({
      ...newTree,
    });
    setShowSpinner(false);
  }

  async function generateChildrenForId(subtree, id) {
    if (!subtree.children) return subtree;

    let newChildren = [];

    for (let i = 0; i < subtree.children.length; i++) {
      if (subtree.children[i].id === id) {
        newChildren.push({
          ...subtree.children[i],
          children: await solveProblem(subtree.children[i].question, 1),
        });
      } else {
        newChildren.push(await generateChildrenForId(subtree.children[i], id));
      }
    }

    subtree.children = newChildren;
    return subtree;
  }

  return (
    <>
      <div className=" h-full flex flex-col items-center justify-center">
        <div
          className="w-full h-full flex flex-col font-mono mt-4"
          style={{
            maxWidth: 900,
          }}
        >
          <div className="p-8  flex flex-col justify-center w-full">
            <p className="text-5xl font-mono">Multivac</p>
            <p className="font-medium text-gray-800 text-md font-mono">
              A general-purpose problem solver
            </p>
          </div>

          <div className="bg-gray-100 rounded p-8" style={{ maxWidth: 1000 }}>
            <p className="font-medium text-lg">
              What problem would you like to solve?
            </p>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full border shadow font- p-4 rounded-lg my-2"
              placeholder="How do I find love?"
            />
            {isLoading ? (
              <button className="font-medium text-white bg-blue-700 text-md px-4 py-2 flex items-center justify-center disabled opacity-75">
                <img src={spinnerSrc} className="w-5 h-5 mr-2" alt="" />
                Calculating...
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="font-medium text-white bg-blue-700 text-md px-4 py-2 flex items-center justify-center"
              >
                Calculate solution
              </button>
            )}
          </div>
        </div>
        {tree !== {} && (
          <>
            <div
              ref={containerRef}
              className="bg-gray-50 w-full h-full items-center  shadow-2xl rounded border-4 mb-8 mt-12"
              style={{
                height: `90vh`,
                width: `90vw`,
              }}
            >
              {showSpinner && (
                <div className="w-full flex  justify-center">
                  <div className="absolute bg-black shadow w-48 flex items-center justify-center rounded px-4 py-2 flex text-white opacity-75 mt-4">
                    <img src={spinnerSrc} className="w-5 h-5 mr-2" alt="" />{" "}
                    Calculating...
                  </div>
                </div>
              )}
              <Tree
                translate={translate}
                depthFactor={500}
                separation={{ siblings: 3, nonSiblings: 3 }}
                data={tree}
                renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
                  if (!nodeDatum.name) return null;
                  return (
                    <g>
                      {/* `foreignObject` requires width & height to be explicitly set. */}
                      <foreignObject
                        onClick={() => onNodeClick(nodeDatum)}
                        width={300}
                        height={600}
                        style={{}}
                      >
                        <div
                          style={{
                            border: "1px solid #000",
                            backgroundColor: "white",
                          }}
                        >
                          <p
                            style={{
                              textAlign: "left",
                              borderRadius: 3,
                              padding: 4,
                              fontSize: 20,
                            }}
                          >
                            {nodeDatum.name}
                          </p>
                        </div>
                      </foreignObject>
                    </g>
                  );
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;

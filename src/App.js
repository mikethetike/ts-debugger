import "./App.css";
import React from "react";
import axios from "axios";

function toLEBytes(num) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt(num), true);
  return bufferToHex(buffer);
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function convertOpToHex(op) {
  let args = op.match(/\(.+\)/gi);
  console.log(args);
  if (op.match(/CheckHeightVerify/gi)) {
    return "66" + toLEBytes(args[0].replace("(", "").replace(")", ""));
  }
  if (op.match(/PushPubKey/gi)) {
    return "7e" + args[0].replace("(", "").replace(")", "");
  }
  return "73";
}
function parseToHex(lines) {
  let result = "";
  lines.forEach(function (item) {
    result += convertOpToHex(item);
  });
  return result;
}

class App extends React.Component {
  constructor(props) {
    super(props);

    // Read script from query
    console.log(window.location);
    const script = new URLSearchParams(window.location.search)
      .get("script")
      ?.split(",") || ["CheckHeightVerify(10)", "CheckHeightVerify(11)"];
    this.state = {
      script: script,
      inputStack: "",
      stack: [],
      output: "Out here",
      hexScript: "",
      executingStep: -1,
      result: [],
      blockHeight: "20",
      prevBlockHash: "",
      commitment: "",
    };
    this.scriptUpdate = this.scriptUpdate.bind(this);
    this.inputStackUpdate = this.inputStackUpdate.bind(this);
    this.blockHeightChange = this.blockHeightChange.bind(this);
    this.onRun = this.onRun.bind(this);
    this.onStep = this.onStep.bind(this);
    this.onStop = this.onStop.bind(this);
  }

  blockHeightChange(event) {
    this.setState({
      blockHeight: event.target.value,
    });
  }
  scriptUpdate(event) {
    this.setState({
      script: event.target.value.split(/\n/),
    });
  }

  inputStackUpdate(event) {
    this.setState({
      inputStack: event.target.value,
    });
  }

  async onStop() {
    this.setState({
      executingStep: -1,
      stepResult: "Stopped",
      stack: [],
    });
  }

  onStep() {
    const newStep = this.state.executingStep + 1;
    console.log("stepping to: ", newStep);
    if (newStep >= this.state.result.length) {
      this.onStop();
      return;
    }
    console.log(this.state.result);
    const result = this.state.result[newStep];
    const newStack =
      result?.step_result.ExecutedSuccessfully.stack_after_executing;
    console.log("new stack", newStack);
    this.setState({
      executingStep: newStep,
      output:
        `${result.op_code}: \n` +
        (result.step_result.Failed
          ? `Error: ${this.state.result[newStep].step_result.Failed?.error}\n`
          : `Succeeded`),
    });
    if (newStack) {
      let text = [];
      newStack.items.forEach(function (item) {
        text.push(JSON.stringify(item));
      });
      this.setState({ stack: text });
    }
  }

  async onRun(e) {
    e.preventDefault();
    console.log("Running");
    console.log(this.state);

    // this.setState({ stack: this.state.inputStack });
    try {
      const hexScript = parseToHex(this.state.script);

      this.setState({ hexScript: hexScript });
      const res = await axios.post("http://localhost:3001/script/run", {
        script: hexScript,
        input: "",
        blockHeight: this.state.blockHeight,
      });
      console.log(res);
      if (res.data.error) {
        this.setState({ output: "Error:" + res.data.message });
      } else {
        this.setState({
          result: res.data.result,
        });
        this.onStep();
      }
    } catch (error) {
      console.error(error);
      this.setState({ output: error });
    }
  }

  render() {
    const { executingStep } = this.state;
    return (
      <div
        className="App"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridGap: 20,
        }}
      >
        <div>
          <h2>Script</h2>
          <textarea
            rows="20"
            onChange={this.scriptUpdate}
            value={this.state.script.join("\n")}
            disabled={this.state.executingStep >= 0}
          />
        </div>
        <div>
          <h2>Input stack</h2>
          <textarea
            rows="10"
            onChange={this.inputStackUpdate}
            value={this.state.inputStack}
          />

          <fieldset>
            <legend>Script context</legend>
            <label>Block height</label>
            <input
              type="number"
              value={this.state.blockHeight}
              onChange={this.blockHeightChange}
            />
          </fieldset>
        </div>
        <div>
          <button onClick={this.onRun} disabled={executingStep >= 0}>
            Start
          </button>
          <button
            onClick={this.onStep}
            disabled={
              executingStep < 0 || this.state.result.length <= executingStep
            }
          >
            Step
          </button>
          <button onClick={this.onStop} disabled={executingStep < 0}>
            Stop
          </button>
          <h3>Script</h3>
          {this.state.script.map(function (line, index) {
            return (
              <pre
                key={index}
                style={{
                  backgroundColor: executingStep === index ? "red" : "white",
                }}
              >
                {line}
              </pre>
            );
          })}
          <h3>Stack</h3>
          <textarea
            rows="20"
            value={this.state.stack ? this.state.stack.join("\n") : "<null>"}
            readOnly
          />
        </div>
        <div>
          <h3>Output</h3>
          <p>Raw hex script: {this.state.hexScript}</p>
          <pre>{this.state.output}</pre>
        </div>
        <div>
          <div>
            <h3>Templates:</h3>
            <ul>
              <li>
                <a href="/?script=CheckHeightVerify(10),CheckHeightVerify(11)">
                  Check height
                </a>
              </li>
              <li>
                <a href="/?script=PushPubkey(9AFDCE7BECF4BA47A15EFEB8720A4CB31F2037E53490EDE1683951278EFD1654)">
                  One sided (Pay to pub key)
                </a>
              </li>
            </ul>
          </div>
          <h2>OP codes</h2>
          <ul>
            <li>
              CheckHeightVerify(height)
              <p>
                Compare the current block height to height. Fails with
                VERIFY_FAILED if the block height &lt; height.
              </p>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

export default App;

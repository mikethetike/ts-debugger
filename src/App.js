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
  if (op.match(/IfThen/gi)) {
    return "61";
  }
  if (op.match(/Else/gi)) {
    return "62";
  }
  if (op.match(/EndIf/gi)) {
    return "63";
  }

  if (op.match(/OrVerify/gi)) {
    return (
      "64" +
      parseInt(args[0].replace("(", "").replace(")", ""))
        .toString(16)
        .padStart(2, "0")
    );
  }
  if (op.match(/CheckHeightVerify/gi)) {
    return "66" + toLEBytes(args[0].replace("(", "").replace(")", ""));
  }
  if (op.match(/CheckHeight/gi)) {
    return "67" + toLEBytes(args[0].replace("(", "").replace(")", ""));
  }
  if (op.match(/PushPubKey/gi)) {
    return "7e" + args[0].replace("(", "").replace(")", "");
  }
  if (op.match(/PushHash/gi)) {
    return "7a" + args[0].replace("(", "").replace(")", "");
  }
  if (op.match(/Dup/gi)) {
    return "71";
  }
  if (op.match(/EqualVerify/gi)) {
    return "81";
  }
  if (op.match(/GeZero/gi)) {
    return "82";
  }
  if (op.match(/GtZero/gi)) {
    return "83";
  }

  if (op.match(/HashBlake256/gi)) {
    return "b0";
  }

  return "I don'T knOw MaN(" + op + ")";
}
function parseToHex(lines) {
  let result = "";
  lines.forEach(function (item) {
    // Allow comments with #
    if (!item.match(/^#/)) {
      result += convertOpToHex(item);
    }
  });
  return result;
}

function convertInputToHex(item) {
  let args = item.match(/\(.+\)/gi);
  if (item.match(/Pubkey/gi)) {
    return "04" + args[0].replace("(", "").replace(")", "");
  }
  return "Idk man";
}
function parseInputToHex(lines) {
  let result = "";
  lines.forEach(function (item) {
    result += convertInputToHex(item);
  });
  return result;
}

class App extends React.Component {
  constructor(props) {
    super(props);

    // Read script from query
    console.log(window.location);
    const search = new URLSearchParams(window.location.search);

    const script = search.get("script")?.split(",") || [
      "CheckHeightVerify(10)",
      "CheckHeightVerify(11)",
    ];
    const inputStack = search.get("input")?.split(",") || [];
    this.state = {
      script: script,
      inputStack: inputStack,
      stack: [],
      output: "Out here",
      hexScript: "",
      inputHex: "",
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
      inputStack: event.target.value.split(/\n/),
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
      if (this.state.stack.length !== 1) {
        this.setState({
          output:
            "WARN: Script ended without leaving exactly one pub key on the stack",
        });
      } else {
        this.setState({ output: "Script finished" });
      }
      this.onStop();
      return;
    }
    console.log(this.state.result);
    const result = this.state.result[newStep];
    const newStack =
      result?.step_result.ExecutedSuccessfully?.stack_after_executing;
    console.log("new stack", newStack);
    this.setState({
      executingStep: newStep,
      output:
        `${result.op_code}: \n` +
        (result.step_result.Failed
          ? `Error: ${this.state.result[newStep].step_result.Failed?.error}\n`
          : result.step_result === "Skipped"
          ? "Skipped"
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
      const inputHex = parseInputToHex(this.state.inputStack);

      this.setState({ hexScript: hexScript, inputHex: inputHex });
      const res = await axios.post("http://localhost:3001/script/run", {
        script: hexScript,
        input: inputHex,
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
          textAlign: "left",
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
            value={this.state.inputStack.join("\n")}
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
          <p>Raw input hex script: {this.state.inputHex}</p>
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
              <li>
                <a href="/?script=Dup,HashBlake256,PushHash(9AFDCE7BECF4BA47A15EFEB8720A4CB3),EqualVerify&input=PubKey(9AFDCE7BECF4BA47A15EFEB8720A4CB31F2037E53490EDE1683951278EFD1654)">
                  One sided (Pay to pub key hash)
                </a>
              </li>
              <li>
                <a href="/?script=Dup,PushPubkey(9AFDCE7BECF4BA47A15EFEB8720A4CB31F2037E53490EDE1683951278EFD1654),CheckHeight(10),GeZero,IFTHEN,PushPubkey(2c43d965e27b5425967b64ec039fd22c19b298ca6af9f6a071f1479ac4e1da57),OrVerify(2),ELSE,EqualVerify,ENDIF&input=PubKey(9AFDCE7BECF4BA47A15EFEB8720A4CB31F2037E53490EDE1683951278EFD1654)">
                  Timelocked
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

export default App;

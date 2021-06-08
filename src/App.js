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
  let args = op.match(/\(\d+\)/gi);
  console.log(args);
  if (op.match(/CheckHeightVerify/)) {
    return "66" + toLEBytes(args[0].replace("(", "").replace(")", ""));
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
    this.state = {
      script: ["CheckHeightVerify(10)", "CheckHeightVerify(11)"],
      inputStack: "",
      stack: "",
      output: "Out here",
      hexScript: "",
      executingStep: -1,
    };
    this.scriptUpdate = this.scriptUpdate.bind(this);
    this.inputStackUpdate = this.inputStackUpdate.bind(this);
    this.stackUpdate = this.stackUpdate.bind(this);
    this.onRun = this.onRun.bind(this);
    this.onStop = this.onStop.bind(this);
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

  stackUpdate(event) {
    this.setState({
      stack: event.target.value,
    });
  }

  async onStop(e) {
    e.preventDefault();
    this.setState({
      executingStep: -1,
    });
  }

  async onRun(e) {
    e.preventDefault();
    console.log("Running");
    console.log(this.state);

    this.setState({ stack: this.state.inputStack });
    try {
      const hexScript = parseToHex(this.state.script);

      this.setState({ hexScript: hexScript });
      const res = await axios.post("http://localhost:3001/script/run", {
        script: hexScript,
        input: "",
      });
      console.log(res);
      if (res.data.error) {
        this.setState({ output: "Error:" + res.data.message });
      } else {
        this.setState({
          executingStep: 0,
          stack: !res.data.result.length
            ? "<stack was empty>"
            : res.data.result,
          output: "Result:" + res.data.result,
        });
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
          {this.state.script.map(function (line, index) {
            return (
              <pre
                style={{
                  backgroundColor: executingStep === index ? "red" : "white",
                }}
              >
                {line}
              </pre>
            );
          })}
        </div>
        <div>
          <h2>Input stack</h2>
          <textarea
            rows="20"
            onChange={this.inputStackUpdate}
            value={this.state.inputStack}
          />
        </div>
        <div>
          <button onClick={this.onRun}>Start</button>
          <button disabled={executingStep < 0}>Step</button>
          <button onClick={this.onStop} disabled={executingStep < 0}>
            Stop
          </button>
          <h3>Stack</h3>
          <textarea rows="20" value={this.state.stack} readOnly />
        </div>
        <div>
          <h3>Output</h3>
          <p>{this.state.hexScript}</p>
          <pre>{this.state.output}</pre>
        </div>
        <div>
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

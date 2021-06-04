import "./App.css";
import React from "react";
import axios from "axios";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      script: "CheckVerify",
      inputStack: "",
      stack: "",
      output: "Out here",
    };
    this.scriptUpdate = this.scriptUpdate.bind(this);
    this.inputStackUpdate = this.inputStackUpdate.bind(this);
    this.stackUpdate = this.stackUpdate.bind(this);
    this.onRun = this.onRun.bind(this);
  }

  scriptUpdate(event) {
    this.setState({
      script: event.target.value,
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

  async onRun() {
    console.log("Running");
    console.log(this.state);

    this.setState({ stack: this.state.inputStack });
    try {
      const res = await axios.post("http://localhost:3001/script/run", {
        script: "73",
        input: "",
      });
      console.log(res);
      if (res.data.error) {
        this.setState({ output: "Error:" + res.data.message });
      } else {
        this.setState({
          stack: !res.data.stack.length
            ? "<stack was empty>"
            : res.data.stack.join("\r\n"),
          output: "Result:" + res.data.result,
        });
      }
    } catch (error) {
      console.error(error);
      this.setState({ output: error });
    }
  }

  render() {
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
            value={this.state.script}
          />
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
          <button onClick={this.onRun}>Run</button>
          <button>Step</button>
          <h3>Stack</h3>
          <textarea rows="20" value={this.state.stack} readOnly />
        </div>
        <div>
          <h3>Output</h3>
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

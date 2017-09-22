import React, { Component } from 'react';
import './App.css';
import ReactFileReader from 'react-file-reader';
import * as d3 from "d3";
var axios = require("axios");

//For every contact that doesn't have zip or street address but does have an IP
//Pull a zip code from their IP address
//TO-DO -- Figure out how to save the results to State rather than the pass-through contacts variable
//Note - limited to just a few zip code API calls to stay within free version of ip-api.com api


class App extends Component {
  constructor(props) {
    super(props);

    this.handleFiles = this.handleFiles.bind(this);
    this.processData = this.processData.bind(this);
    this.getLocationForContact = this.getLocationForContact.bind(this);
    this.processZips = this.processZips.bind(this);
    this.state = {
      contacts: [],
      zipCodes: []
    };
  }
  //Parses the CSV data and stores it into an array called contacts
  //Calls the processData function to add zip codes for any contacts who only have IP
  //TO-DO -- need to figure out why setState isn't working
  handleFiles = files => {
    var reader = new FileReader();
    reader.readAsBinaryString(files[0]);

    reader.onload = (e) => {
      var contacts = d3.csvParse(reader.result);
      this.setState({ contacts: contacts });
      this.processData();
    }
  }

  processData() {
    var contacts = this.state.contacts;

    var receipts = [];

    for(var i = 0; i < contacts.length; i++) {
      if (!contacts[i]['Street Address'] && !contacts[i]['Zip Code'] && contacts[i]['IP Address']) {
        console.log('GOT A RECEIPT');
        const receipt = this.getLocationForContact(receipts.length, contacts[i]);

        receipts.push({ receipt, i });
      }
    }

    Promise
      .all(receipts.map(r => r.receipt))
      .then(responses => responses.map(r => r.data))
      .then(burgers => {
        console.log('GOT THE BURGERZ!');  
        for(var i = 0; i < burgers.length; i++) {
          var receipt = receipts[i];

          var contact = contacts[receipt.i];

          contact['Zip Code'] = burgers[i].zip;
          contact.ipMapped = true;
        }

//Once all the Promises are returned, this code will update the contacts and export them as a CSV.
        this.setState({ contacts });

        var newData = "data:text/csv;charset=utf-8," + d3.csvFormat(contacts);
        var encodedUri = encodeURI(newData);
        var link = document.createElement("a");      
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "updated_contacts.csv");
        document.body.appendChild(link); // Required for FF
        link.click();

        this.processZips();
      });


  }

  processZips() {
    var contacts = this.state.contacts;
    var zipCodes = [];
    for (var i=0; i < contacts.length; i++) {
      var zipCode = contacts[i]['Zip Code'];
      if (zipCodes[zipCode]) zipCodes[zipCode] += 1;      
      if (!zipCodes[zipCode]) zipCodes[zipCode] = 1;
    }
    this.setState({zipCodes});
  }

  getLocationForContact(i, contact) {
    return new Promise(function(resolve, reject) {
      setTimeout(() => {
        axios
          .get("http://ip-api.com/json/" + contact["IP Address"])
          .then(resolve);
      }, i * 500); //pause 500 milliseconds between each request so that we never go over 150 requests per minute
    });
  }


  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src="https://amandamilke.files.wordpress.com/2015/05/logo.png" className="App-logo" alt="logo" />
          <h2>IP Address Mapper</h2>
        </div>
        <p className="App-intro">
          Upload your contacts with IP Addresses in CSV format.
        </p>

        <div id="magic-vis">
          This is where someday I will visualize the zip codes!!!
        </div>

        <pre>
          {JSON.stringify(this.state.contacts, null, 2)}
        </pre>

        <ReactFileReader fileTypes=".csv" handleFiles={this.handleFiles}>
          <button className='btn'>Upload</button>
        </ReactFileReader>

      </div>

    );
  }
}


export default App;

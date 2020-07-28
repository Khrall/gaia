import React from 'react';
import { Header } from 'semantic-ui-react';
import WateringSystem from './WateringSystem';

import 'semantic-ui-css/semantic.min.css';
import './App.scss';


const App = () => (
  <div className="App">
    <header className="App-header">
      <Header as="h1" color="teal">
        Project GAIA
        </Header>
    </header>

    <div className="App-body">
      <WateringSystem />
    </div>
  </div>
);

export default App;

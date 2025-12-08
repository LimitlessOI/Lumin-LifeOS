```jsx
import React from 'react';

class PreferenceForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            preferences: {}
        };
    }

    handleChange(event) {
        const { name, value } = event.target;
        this.setState(prevState => ({
            preferences: {
                ...prevState.preferences,
                [name]: value
            }
        }));
    }

    handleSubmit(event) {
        event.preventDefault();
        // Submit preferences to backend
        console.log('Submitting preferences:', this.state.preferences);
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit.bind(this)}>
                <label>
                    Preference 1:
                    <input type="text" name="preference1" onChange={this.handleChange.bind(this)} />
                </label>
                <button type="submit">Submit</button>
            </form>
        );
    }
}

export default PreferenceForm;
```
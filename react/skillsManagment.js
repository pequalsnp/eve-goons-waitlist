import React from 'react';
import SkillCategoryMenu from './components/Skills/SkillCategoryMenu';
import SkillSettings from './components/Skills/SkillSettings';
import ReactDOM from 'react-dom';
import Dialog from 'components/Dialog';

const skillManagmentEndpoint = "/internal-api/v2/skills-managment"

class SkillsManagment extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            failures: 0,    
            backingOff: false,
            skillsData: {
                list: []
            }
        }

        this.SkillSetName = React.createRef();
        this.SkillSetType = React.createRef();
    }

    updateData() {
        $.ajax({
            url: skillManagmentEndpoint,
            type: "GET"
        }).done((data) => {
            this.setState({skillsData: data});
        }).fail((error) => {
            console.log(error);
        });
    }

    componentDidMount() {
        this.updateData();
    }

    addNewSkillSet(e) {
        e.preventDefault();
        $.ajax({
            url: skillManagmentEndpoint,
            type: "POST",
            data: {
                name: this.SkillSetName.current.value,
                type: this.SkillSetType.current.value
            }
        }).done(() => {
            $("#newSkillSet").modal('hide');
            this.updateData();
        }).fail((err) => {
            console.log(err);
        });
    }

    updateSelectedSkillSet(index) {
        this.setState({ selectedSkillSet: index });
    }

    getSelectedSkillSet() {
        let index = this.state.selectedSkillSet
        if(index != undefined && !!this.state.skillsData) {
            return this.state.skillsData.list[index];
        } else if(!!this.state.skillsData.list) {
            return this.state.skillsData.list[0];
        }

        return undefined;
    }

    render() {
        return (
            <div>
                <section className="no-padding-top no-padding-bottom container-fluid">
                    <div className="row">
                        <div className="col-lg-4 col-md-6 col-sm-12">
                            <SkillCategoryMenu skillList={this.state.skillsData.list} onSetSelected={this.updateSelectedSkillSet.bind(this)} />
                        </div>
                        <div className="col-lg-8 col-md-6 col-sm-12">
                            <SkillSettings set={this.getSelectedSkillSet()} onChange={this.updateData.bind(this)} />
                        </div>
                    </div>
                </section>

                <Dialog title="Add a new Skill Set" id="newSkillSet">
                    <form onSubmit={this.addNewSkillSet.bind(this)}>
                        <div className="form-group">
                            <label htmlFor="skillSetName">Skill set name</label>
                            <input type="text" name="skillSetName" id="skillSetName" className="form-control" placeholder="Vindicator" ref={this.SkillSetName}/>
                            <small className="text-muted">Thsese will be sorted in alphabetical order.</small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="skillSetType">Skill Set Type</label>
                            <select name="skillSetType" id="skillSetType" className="form-control mb-0" ref={this.SkillSetType} required>
                                <option value="Capitals">Capitals</option>
                                <option value="DPS">DPS</option>
                                <option value="Logistics &amp; Support">Logistics and Support</option>
                                <option value="Snipers">Snipers</option>
                                <option value="Supers">Super Capitals</option>
                                <option value="Other">Other</option>
                            </select>
                            <small className="text-muted">Categories that can be used to view similiar skill types</small>
                        </div>
                        <button className="btn btn-success"><i className="fas fa-check-circle"></i> Save</button>
                    </form>
                </Dialog>
            </div>
        );
    }

}

const reactAttach = document.querySelector('#react-skillsManagement-attach')
ReactDOM.render(<SkillsManagment />, reactAttach);
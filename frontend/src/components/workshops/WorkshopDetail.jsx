import React, { useEffect } from 'react';
     import { useDispatch, useSelector } from 'react-redux';
     import { fetchWorkshop } from '../../store/actions/workshopActions';
     import './WorkshopDetail.css';

     const WorkshopDetail = ({ match }) => {
       const dispatch = useDispatch();
       const workshop = useSelector(state => state.workshops.workshop);

       useEffect(() => {
         dispatch(fetchWorkshop(match.params.id));
       }, [dispatch, match.params.id]);

       if (!workshop) return <div>Loading...</div>;

       return (
         <div className="workshop-detail">
           <h1>{workshop.title}</h1>
           <p>{workshop.description}</p>
           <p>Date: {new Date(workshop.date).toLocaleDateString()}</p>
           <p>Location: {workshop.location}</p>
         </div>
       );
     };

     export default WorkshopDetail;
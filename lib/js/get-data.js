//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

//function to display list of medications
function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}

//helper function to get quanity and unit from an observation resoruce.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

//helper function to get only quanity from an observation in order to calcuate total cholesterol 
function getQuantity(ob) {
  if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2));
  } else {
    return undefined;
  }
}

// function to calculate totalCholesterol
function getTotalCholesterol(hdl, ldl, tri){
  let totalCholesterol;

  if (hdl != 'undefined' && ldl != 'undefined' && tri != 'undefined') {
    totalCholesterol = (ldl + hdl) + (0.2 * tri);    
    return totalCholesterol;
  }
  return "";
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

// create a patient object to initalize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
	triglyceride: {
		value: ''
	},
	cholesterol: {
		value: ''
	},
    note: 'No Annotation',
  };
}


//function to display the observation values you will need to update this
function displayObservation(obs) {
  hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;
  weight.innerHTML = obs.weight;
  height.innerHTML = obs.height; 
  triglyceride.innerHTML = obs.triglyceride;  
  cholesterol.innerHTML = obs.cholesterol;
}

//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
    }
  );

  // get observation resoruce values
  // you will need to update the below to retrive the weight and height values
  var query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
query.set("code", [
  'http://loinc.org|8462-4',
  'http://loinc.org|8480-6',
  'http://loinc.org|2085-9',
  'http://loinc.org|18262-6',
  'http://loinc.org|55284-4',
  'http://loinc.org|3141-9',
  'http://loinc.org|2571-8',  
  'http://loinc.org|8302-2', 	//Body Height
  'http://loinc.org|29463-7',  //weight  
].join(","));

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(ob) {

      // group all of the observation resoruces by type into their own
      var byCodes = client.byCodes(ob, 'code');
      var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
      var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
	  var hdl = byCodes('2085-9');
	  var ldl = byCodes('18262-6');
	  var triglyceride = byCodes('2571-8');
	  var weight = byCodes('29463-7');
	  var height = byCodes('8302-2');

      // create patient object
      var p = defaultPatient();

      // set patient value parameters to the data pulled from the observation resoruce
      if (typeof systolicbp != 'undefined') {
        p.sys = systolicbp;
      } else {
        p.sys = 'undefined'
      }

      if (typeof diastolicbp != 'undefined') {
        p.dia = diastolicbp;
      } else {
        p.dia = 'undefined'
      }
      
	  p.weight = getQuantityValueAndUnit(weight[0]);
	  p.height = getQuantityValueAndUnit(height[0]);
	  p.hdl = getQuantityValueAndUnit(hdl[0]);
	  p.ldl = getQuantityValueAndUnit(ldl[0]);
	  p.triglyceride = getQuantityValueAndUnit(triglyceride[0]);
	  hdl = getQuantity(hdl[0]);
	  ldl = getQuantity(ldl[0]);
	  tri = getQuantity(triglyceride[0]);		
	  p.cholesterol = getTotalCholesterol(hdl,ldl,tri);

      displayObservation(p)

    });


function displayRiskEvaluation() {
	if(ldl > 100 && hdl < 40 && cholesterol > 220 && cholesterol != 'undefined'){
      norisk.innerHTML = 'This patient is at risk of cardio vascular disease.'	  
    }
	 else{
      norisk.innerHTML= 'Patient is not at risk of cardio vascular disease.'
    }
}

  // get medication request resources this will need to be updated
  // the goal is to pull all the medication requests and display it in the app. It can be both active and stopped medications
	var queryTwo = new URLSearchParams();

	queryTwo.set("patient", client.patient.id);
	queryTwo.set("_count", 100);
	queryTwo.set("_sort", "-date");

	var medResults = [];
	
	client.request("MedicationRequest?" + queryTwo, {
        pageLimit: 0, 
        flat: true 
    }).then(
        function(md) {
			md.forEach(function (med) {
				if (med.medicationCodeableConcept != undefined) {
					medResults.push(med.medicationCodeableConcept.coding[0].display);
				}
			});	

            // get medication request resources this will need to be updated
            // the goal is to pull all the medication requests and display it in the app. It can be both active and stopped medications
            medResults.forEach(function(med) {
                displayMedication(med);
            });
        }
    );



  //event listner when the add button is clicked to call the function that will add the note to the weight observation
 document.getElementById('riskevaluation').addEventListener('click', displayRiskEvaluation);


}).catch(console.error);

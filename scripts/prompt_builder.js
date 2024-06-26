"use strict";

const TEMPLATE_SET = 'template1';

async function promptBuilder(templateFile='template.txt', isExample=false) {
    try {
        const response = await fetch(`prompt/${TEMPLATE_SET}/${templateFile}`);
        let template = await response.text();
        
        const constraintResponse = await fetch(`prompt/${TEMPLATE_SET}/constraint.txt`);
        const constraint = await constraintResponse.text();
        template = template.replaceAll('[%CONSTRAINT%]', constraint);

        if (isExample) {
        	const jsonResponse = await fetch(`prompt/${TEMPLATE_SET}/scene_example.json`);
        	const sceneRepresentation = await jsonResponse.json();
        	template = template.replaceAll('[%SCENE REPRESENTATION%]', JSON.stringify(sceneRepresentation, null, 2));
        } else {
        	const examples = await promptBuilder(templateFile='examples.txt', isExample=true);
        	template = template.replaceAll('[%EXAMPLES%]', examples);
        	console.log(template);
        }

        return template

    } catch (error) {
        console.error('Error fetching the text file:', error);
    }
}
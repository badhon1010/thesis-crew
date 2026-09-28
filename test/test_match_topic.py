from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
import time

service_obj = Service()

options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options, service=service_obj)

driver.maximize_window()
driver.get("http://localhost:5173/")

driver.find_element(By.LINK_TEXT, "Sign In").click()
time.sleep(2)

driver.find_element(By.XPATH, "(//button[@type='button'])[3]").click()
time.sleep(2)

driver.find_element(By.XPATH, "//input[@type='email']").send_keys("abc@teacher.com")
driver.find_element(By.XPATH, "//input[@type='password']").send_keys("123456")

driver.find_element(By.XPATH, "(//button[@type='submit'])").click()
time.sleep(10)

driver.find_element(By.XPATH, "//a[@href='/teacher/topics/create']").click()
time.sleep(2)

driver.find_element(By.NAME, "title").send_keys("Automated Medical Diagnosis System using Machine Learning")

driver.find_element(By.NAME, "category").send_keys("Machine Learning")

driver.find_element(By.NAME, "requiredSkills").send_keys("Python, Machine Learning, React, Node.js")

driver.find_element(By.NAME, "maxTeamSize").send_keys("4")

driver.find_element(By.NAME, "applicationDeadline").send_keys("12-31-2026")

driver.find_element(By.NAME, "description").send_keys("This research aims to develop a robust automated medical diagnosis system. The project involves data preprocessing, training machine learning models, and building an API for predictions. The ideal candidates must be proficient in the exact required skills to build and deploy the system end-to-end.")

time.sleep(2)

driver.find_element(By.XPATH, "(//button[@type='button'])[5]").click()
time.sleep(4)

print("Topic created successfully!")

#driver.quit()

